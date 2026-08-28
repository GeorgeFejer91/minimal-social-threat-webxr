"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { XrSceneHandle } from "./XrScene";
import { TopdownScene } from "./TopdownScene";
import {
  evaluateScenario,
  isScenarioComplete,
  type Intensity,
  type ScenarioConfig,
  type SceneMode,
  type SceneSnapshot,
  type ThreatKind,
} from "../lib/scenario";
import { SceneBroadcaster, SceneReceiver, type SceneCommand } from "../lib/scene-sync";

type AppView = "landing" | "headset" | "companion";

const XrScene = lazy(() => import("./XrScene"));

const DEFAULT_CONFIG: ScenarioConfig = {
  threatKind: "tiger",
  intensity: "gentle",
  mode: "virtual",
  loop: false,
};

function anonymousId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12)
    ?? Math.random().toString(16).slice(2, 14);
  return `${prefix}_${suffix}`;
}

function phaseLabel(phase: SceneSnapshot["phase"]) {
  return {
    ready: "Ready",
    baseline: "Social baseline",
    detected: "Threat detected",
    approach: "Threat approaching",
    hold: "Safety-distance hold",
    complete: "Complete",
  }[phase];
}

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function quoteCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

interface LogRow {
  schema_version: 1;
  session_id: string;
  client_time_iso: string;
  event: string;
  source: "headset" | "companion" | "local";
  elapsed_ms: number;
  phase: string;
  running: boolean;
  paused: boolean;
  threat_kind: string;
  threat_distance_m: number;
  scene_json: string;
}

function Nav({ current, onNavigate }: { current: AppView; onNavigate(view: AppView): void }) {
  return (
    <nav className="top-nav" aria-label="Application views">
      <button className="brand" type="button" onClick={() => onNavigate("landing")}>
        <span className="brand-mark" aria-hidden="true">ST</span>
        <span>Social Threat Lab <small>WebXR prototype</small></span>
      </button>
      <div className="nav-links">
        <button type="button" aria-current={current === "headset" ? "page" : undefined} onClick={() => onNavigate("headset")}>Headset scene</button>
        <button type="button" aria-current={current === "companion" ? "page" : undefined} onClick={() => onNavigate("companion")}>Companion view</button>
      </div>
    </nav>
  );
}

export default function StudyApp() {
  const [view, setView] = useState<AppView>("landing");
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [sessionId, setSessionId] = useState("session_preview");
  const runtimeRef = useRef({ elapsedMs: 0, running: false, paused: false, lastFrameAt: 0, lastCommandId: undefined as string | undefined });
  const [scene, setScene] = useState(() => evaluateScenario(DEFAULT_CONFIG, 0, "session_preview"));
  const configRef = useRef(config);
  const sessionIdRef = useRef(sessionId);
  const sceneRef = useRef(scene);
  const xrRef = useRef<XrSceneHandle>(null);
  const [xrActive, setXrActive] = useState(false);
  const [xrStatus, setXrStatus] = useState("Desktop preview ready. Immersive WebXR requires HTTPS or localhost.");
  const [xrSupport, setXrSupport] = useState({ vr: false, ar: false, checked: false });
  const [contentReady, setContentReady] = useState(false);
  const [broadcastState, setBroadcastState] = useState<Record<string, unknown>>({ phase: "idle", listenerCount: 0 });
  const broadcasterRef = useRef<SceneBroadcaster | undefined>(undefined);
  const logsRef = useRef<LogRow[]>([]);
  const [logCount, setLogCount] = useState(0);
  const lastSampleAtRef = useRef(-Infinity);
  const lastPhaseRef = useRef(scene.phase);

  const receiverRef = useRef<SceneReceiver | undefined>(undefined);
  const [receiverState, setReceiverState] = useState<ReturnType<SceneReceiver["snapshot"]>>({
    phase: "idle", sources: [], selectedStreamId: "", sourceLabel: "", latest: undefined,
    packetAgeMs: undefined, route: "unknown", rttMs: undefined,
  });
  const [pendingCommand, setPendingCommand] = useState("");
  const [companionStatus, setCompanionStatus] = useState("Scene link is off. No connection is made until you press Connect.");

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { sceneRef.current = scene; }, [scene]);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "landing") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const readView = () => {
      const value = new URLSearchParams(window.location.search).get("view");
      setView(value === "headset" || value === "companion" ? value : "landing");
    };
    readView();
    addEventListener("popstate", readView);
    return () => removeEventListener("popstate", readView);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function inspectSupport() {
      if (!navigator.xr) {
        if (!cancelled) setXrSupport({ vr: false, ar: false, checked: true });
        return;
      }
      const [vr, ar] = await Promise.all([
        navigator.xr.isSessionSupported("immersive-vr").catch(() => false),
        navigator.xr.isSessionSupported("immersive-ar").catch(() => false),
      ]);
      if (!cancelled) setXrSupport({ vr, ar, checked: true });
    }
    void inspectSupport();
    return () => { cancelled = true; };
  }, []);

  const appendLog = useCallback((event: string, source: LogRow["source"], snapshot = sceneRef.current) => {
    const row: LogRow = {
      schema_version: 1,
      session_id: snapshot.sessionId,
      client_time_iso: new Date().toISOString(),
      event,
      source,
      elapsed_ms: snapshot.elapsedMs,
      phase: snapshot.phase,
      running: snapshot.running,
      paused: snapshot.paused,
      threat_kind: snapshot.threat.kind,
      threat_distance_m: Number(snapshot.threat.distance.toFixed(4)),
      scene_json: JSON.stringify(snapshot),
    };
    logsRef.current.push(row);
    if (logsRef.current.length > 12_000) logsRef.current.splice(0, logsRef.current.length - 12_000);
    setLogCount(logsRef.current.length);
  }, []);

  const rebuildScene = useCallback((overrides: Partial<typeof runtimeRef.current> = {}) => {
    Object.assign(runtimeRef.current, overrides);
    const runtime = runtimeRef.current;
    const next = evaluateScenario(configRef.current, runtime.elapsedMs, sessionIdRef.current, runtime);
    sceneRef.current = next;
    setScene(next);
    return next;
  }, []);

  const startScenario = useCallback((source: LogRow["source"] = "local") => {
    const id = anonymousId("session");
    setSessionId(id);
    sessionIdRef.current = id;
    logsRef.current = [];
    setLogCount(0);
    lastSampleAtRef.current = -Infinity;
    runtimeRef.current = { elapsedMs: 0, running: true, paused: false, lastFrameAt: performance.now(), lastCommandId: runtimeRef.current.lastCommandId };
    const next = evaluateScenario(configRef.current, 0, id, runtimeRef.current);
    sceneRef.current = next;
    setScene(next);
    appendLog("scenario_start", source, next);
  }, [appendLog]);

  const resetScenario = useCallback((source: LogRow["source"] = "local") => {
    runtimeRef.current = { elapsedMs: 0, running: false, paused: false, lastFrameAt: performance.now(), lastCommandId: runtimeRef.current.lastCommandId };
    const next = rebuildScene();
    appendLog("scenario_reset", source, next);
  }, [appendLog, rebuildScene]);

  const pauseScenario = useCallback((source: LogRow["source"] = "local") => {
    if (!runtimeRef.current.running) return;
    const paused = !runtimeRef.current.paused;
    const next = rebuildScene({ paused, lastFrameAt: performance.now() });
    appendLog(paused ? "scenario_pause" : "scenario_resume", source, next);
    setXrStatus(paused ? "Scenario paused. The threat and agents are stationary." : "Scenario resumed.");
  }, [appendLog, rebuildScene]);

  const applyCommand = useCallback((command: SceneCommand) => {
    runtimeRef.current.lastCommandId = command.requestId;
    let configurationEvent = "";
    if (command.action === "start") startScenario("companion");
    else if (command.action === "reset") resetScenario("companion");
    else if (command.action === "pause" && !runtimeRef.current.paused) pauseScenario("companion");
    else if (command.action === "resume" && runtimeRef.current.paused) pauseScenario("companion");
    else if (command.action === "set-threat") {
      if (!runtimeRef.current.running || isScenarioComplete(sceneRef.current)) {
        const nextConfig = { ...configRef.current, threatKind: command.value };
        configRef.current = nextConfig;
        setConfig(nextConfig);
        configurationEvent = "set_threat";
      }
    } else if (command.action === "set-intensity") {
      if (!runtimeRef.current.running || isScenarioComplete(sceneRef.current)) {
        const nextConfig = { ...configRef.current, intensity: command.value };
        configRef.current = nextConfig;
        setConfig(nextConfig);
        configurationEvent = "set_intensity";
      }
    }
    const applied = rebuildScene({ lastCommandId: command.requestId });
    if (configurationEvent) appendLog(configurationEvent, "companion", applied);
  }, [appendLog, pauseScenario, rebuildScene, resetScenario, startScenario]);

  useEffect(() => {
    const broadcaster = new SceneBroadcaster();
    broadcasterRef.current = broadcaster;
    const stateHandler = (event: Event) => {
      const detail = (event as Event & { detail: Record<string, unknown> }).detail;
      setBroadcastState(detail);
    };
    const commandHandler = (event: Event) => applyCommand((event as Event & { detail: SceneCommand }).detail);
    broadcaster.addEventListener("statechange", stateHandler);
    broadcaster.addEventListener("command", commandHandler);

    const receiver = new SceneReceiver();
    receiverRef.current = receiver;
    const receiverStateHandler = (event: Event) => {
      const detail = (event as Event & { detail: ReturnType<SceneReceiver["snapshot"]> & { message?: string } }).detail;
      setReceiverState(detail);
      if (detail.message) setCompanionStatus(detail.message);
    };
    const frameHandler = (event: Event) => {
      const detail = (event as Event & { detail: ReturnType<SceneReceiver["snapshot"]> }).detail;
      setReceiverState(detail);
      const ack = detail.latest?.snapshot.lastCommandId;
      if (ack) setPendingCommand((current) => current === ack ? "" : current);
    };
    receiver.addEventListener("statechange", receiverStateHandler);
    receiver.addEventListener("frame", frameHandler);

    return () => {
      broadcaster.removeEventListener("statechange", stateHandler);
      broadcaster.removeEventListener("command", commandHandler);
      receiver.removeEventListener("statechange", receiverStateHandler);
      receiver.removeEventListener("frame", frameHandler);
      void broadcaster.stop();
      void receiver.stop();
    };
  }, [applyCommand]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const next = evaluateScenario(config, runtime.elapsedMs, sessionId, runtime);
    sceneRef.current = next;
    setScene(next);
  }, [config, sessionId]);

  useEffect(() => {
    let animationId = 0;
    const tick = (now: number) => {
      const runtime = runtimeRef.current;
      if (!runtime.lastFrameAt) runtime.lastFrameAt = now;
      const delta = Math.min(100, Math.max(0, now - runtime.lastFrameAt));
      runtime.lastFrameAt = now;
      if (runtime.running && !runtime.paused && !isScenarioComplete(sceneRef.current)) {
        runtime.elapsedMs += delta;
        const next = evaluateScenario(configRef.current, runtime.elapsedMs, sessionIdRef.current, runtime);
        sceneRef.current = next;
        setScene(next);
      } else if (runtime.running && isScenarioComplete(sceneRef.current) && configRef.current.loop) {
        runtime.elapsedMs = 0;
        appendLog("scenario_loop", "local", sceneRef.current);
        const next = evaluateScenario(configRef.current, 0, sessionIdRef.current, runtime);
        sceneRef.current = next;
        setScene(next);
      }
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [appendLog]);

  useEffect(() => {
    broadcasterRef.current?.offer(scene);
    if (scene.elapsedMs - lastSampleAtRef.current >= 100 || scene.phase !== lastPhaseRef.current) {
      appendLog("sample", "headset", scene);
      lastSampleAtRef.current = scene.elapsedMs;
      lastPhaseRef.current = scene.phase;
    }
  }, [appendLog, scene]);

  const updateConfig = <K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const enterImmersive = async (mode: SceneMode) => {
    if (!contentReady) {
      setXrStatus("Review and acknowledge the content note before starting.");
      return;
    }
    try {
      await xrRef.current?.enter(mode);
      updateConfig("mode", mode);
      startScenario("headset");
    } catch (error) {
      setXrStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const startBroadcast = async () => {
    try {
      await broadcasterRef.current?.start();
      broadcasterRef.current?.offer(sceneRef.current);
    } catch (error) {
      setBroadcastState({ phase: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const startDiscovery = async () => {
    try { await receiverRef.current?.startDiscovery(); }
    catch (error) { setCompanionStatus(error instanceof Error ? error.message : String(error)); }
  };

  const sendCommand = (command: Parameters<SceneReceiver["send"]>[0]) => {
    const requestId = receiverRef.current?.send(command) ?? "";
    if (requestId) {
      setPendingCommand(requestId);
      setCompanionStatus("Command sent; waiting for headset readback…");
      window.setTimeout(() => {
        setPendingCommand((current) => {
          if (current !== requestId) return current;
          setCompanionStatus("No headset readback arrived; the command may not have been applied.");
          return "";
        });
      }, 2_500);
    }
  };

  const exportLog = () => {
    const columns: Array<keyof LogRow> = [
      "schema_version", "session_id", "client_time_iso", "event", "source", "elapsed_ms", "phase",
      "running", "paused", "threat_kind", "threat_distance_m", "scene_json",
    ];
    const csv = [columns.join(","), ...logsRef.current.map((row) => columns.map((column) => quoteCsv(row[column])).join(","))].join("\n");
    downloadText(`${scene.sessionId}.csv`, csv, "text/csv;charset=utf-8");
  };

  const remoteScene = receiverState.latest?.snapshot;
  const broadcastPhase = String(broadcastState.phase ?? "idle");
  const listenerCount = Number(broadcastState.listenerCount ?? 0);
  const connectionReadout = broadcastPhase === "broadcasting"
    ? `${listenerCount} companion${listenerCount === 1 ? "" : "s"} · ${String(broadcastState.route ?? "waiting")}`
    : broadcastPhase;
  const phaseProgress = Math.min(100, (scene.elapsedMs / (scene.config.intensity === "gentle" ? 29_000 : 23_000)) * 100);

  const supportLabel = useMemo(() => {
    if (!xrSupport.checked) return "Checking immersive support…";
    if (!xrSupport.vr && !xrSupport.ar) return "Desktop preview only in this browser";
    return `${xrSupport.vr ? "VR ready" : "VR unavailable"} · ${xrSupport.ar ? "MR ready" : "MR unavailable"}`;
  }, [xrSupport]);

  const handleSessionChange = useCallback((active: boolean) => setXrActive(active), []);
  const handleXrStatus = useCallback((message: string) => setXrStatus(message), []);
  const handleXrPause = useCallback(() => {
    if (runtimeRef.current.running && !runtimeRef.current.paused) pauseScenario("headset");
  }, [pauseScenario]);

  return (
    <main>
      <Nav current={view} onNavigate={navigate} />

      {view === "landing" && (
        <section className="landing-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Minimal social-agent study kit</p>
            <h1>A social threat scene<br />you can read at a glance.</h1>
            <p className="hero-lede">
              Six emoji-like agents surround an observer. A visible threat approaches, the group detects it,
              looks afraid, and moves away—inside virtual reality, passthrough mixed reality, or a desktop preview.
            </p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => navigate("headset")}>Open headset scene <span>→</span></button>
              <button className="button ghost" type="button" onClick={() => navigate("companion")}>Open top-down companion</button>
            </div>
            <dl className="hero-facts">
              <div><dt>6</dt><dd>social agents</dd></div>
              <div><dt>1.8 m</dt><dd>hard threat limit</dd></div>
              <div><dt>20 Hz</dt><dd>scene readback</dd></div>
            </dl>
          </div>
          <div className="hero-diagram" aria-label="Diagram showing a viewer surrounded by agents while a threat approaches">
            <div className="radar-ring ring-a" />
            <div className="radar-ring ring-b" />
            <div className="hero-viewer">YOU</div>
            {["a", "b", "c", "d", "e", "f"].map((name, index) => <div key={name} className={`hero-agent agent-${name}`}>{index < 2 ? "!" : "•"}</div>)}
            <div className="hero-threat"><span>⌁</span><small>THREAT</small></div>
            <div className="approach-line" />
          </div>
          <p className="landing-note">
            This is an experimental stimulus builder—not a validated diagnostic or a pre-validated social-threat paradigm.
            Pilot-test recognition, intensity, timing, and comfort with your target population before data collection.
          </p>
        </section>
      )}

      {view === "headset" && (
        <section className="workspace-shell">
          <header className="workspace-heading">
            <div><p className="eyebrow"><span /> Headset scene</p><h1>Run the encounter</h1></div>
            <div className="support-chip"><span className={xrSupport.vr || xrSupport.ar ? "live-dot" : "idle-dot"} />{supportLabel}</div>
          </header>

          <div className="headset-layout">
            <section className="scene-panel">
              <Suspense fallback={<div className="scene-loading" role="status">Loading procedural scene…</div>}>
                <XrScene
                  ref={xrRef}
                  snapshot={scene}
                  onPauseRequest={handleXrPause}
                  onSessionChange={handleSessionChange}
                  onStatus={handleXrStatus}
                />
              </Suspense>
              <div className="scene-overlay top-left">
                <span className={`status-dot ${scene.paused ? "paused" : scene.running ? "active" : ""}`} />
                <strong>{phaseLabel(scene.phase)}</strong>
                <span>{(scene.elapsedMs / 1_000).toFixed(1)} s</span>
              </div>
              <div className="scene-overlay bottom-progress"><span style={{ width: `${phaseProgress}%` }} /></div>
              <div className="scene-overlay safety-readout">Safety limit <strong>{scene.minimumThreatDistance.toFixed(1)} m</strong></div>
            </section>

            <aside className="control-stack">
              <section className="control-card">
                <div className="card-heading"><div><span>01</span><h2>Stimulus</h2></div><small>Configure before entry</small></div>
                <div className="field-grid">
                  <label>Threat
                    <select value={config.threatKind} disabled={xrActive || (scene.running && !isScenarioComplete(scene))} onChange={(event) => updateConfig("threatKind", event.target.value as ThreatKind)}>
                      <option value="tiger">Stylized tiger</option>
                      <option value="angry-agent">Angry agent</option>
                    </select>
                  </label>
                  <label>Intensity
                    <select value={config.intensity} disabled={xrActive || (scene.running && !isScenarioComplete(scene))} onChange={(event) => updateConfig("intensity", event.target.value as Intensity)}>
                      <option value="gentle">Gentle · 18 s approach</option>
                      <option value="standard">Standard · 12 s approach</option>
                    </select>
                  </label>
                  <label>Desktop preview
                    <select value={config.mode} disabled={xrActive} onChange={(event) => updateConfig("mode", event.target.value as SceneMode)}>
                      <option value="virtual">Dusk clearing background</option>
                      <option value="passthrough">Transparent / passthrough</option>
                    </select>
                  </label>
                  <label className="check-field"><input type="checkbox" checked={config.loop} disabled={scene.running && !isScenarioComplete(scene)} onChange={(event) => updateConfig("loop", event.target.checked)} />Loop after completion</label>
                </div>
              </section>

              <section className="control-card warning-card">
                <div className="card-heading"><div><span>02</span><h2>Readiness</h2></div></div>
                <p><strong>Content note:</strong> a hostile figure approaches the observer while nearby agents display fear and avoidance. The threat never crosses the 1.8 m marker.</p>
                <label className="check-field ready-check"><input type="checkbox" checked={contentReady} onChange={(event) => setContentReady(event.target.checked)} />I reviewed the content and stop procedure</label>
                <p className="microcopy">Either XR controller trigger pauses motion. The companion operator can also pause or reset.</p>
              </section>

              <section className="control-card">
                <div className="card-heading"><div><span>03</span><h2>Run</h2></div><small>{xrActive ? "Immersive" : "Desktop"}</small></div>
                <div className="button-grid">
                  <button className="button primary" type="button" disabled={!contentReady} onClick={() => startScenario("headset")}>Start preview</button>
                  <button className="button danger" type="button" disabled={!scene.running} onClick={() => pauseScenario("headset")}>{scene.paused ? "Resume" : "Pause now"}</button>
                  <button className="button ghost" type="button" onClick={() => resetScenario("headset")}>Reset</button>
                </div>
                <div className="immersive-buttons">
                  <button className="button xr" type="button" disabled={!xrSupport.vr || !contentReady || xrActive} onClick={() => void enterImmersive("virtual")}><span>VR</span> Enter virtual scene</button>
                  <button className="button xr" type="button" disabled={!xrSupport.ar || !contentReady || xrActive} onClick={() => void enterImmersive("passthrough")}><span>MR</span> Enter passthrough</button>
                </div>
                <p className="status-line" role="status">{xrStatus}</p>
              </section>

              <section className="control-card link-card">
                <div className="card-heading"><div><span>04</span><h2>Companion link</h2></div><small className={broadcastPhase === "broadcasting" ? "online" : ""}>{connectionReadout}</small></div>
                {broadcastPhase !== "broadcasting" ? (
                  <button className="button link-button" type="button" onClick={() => void startBroadcast()}>Start scene broadcast</button>
                ) : (
                  <button className="button ghost" type="button" onClick={() => void broadcasterRef.current?.stop()}>Stop broadcast</button>
                )}
                <p className="microcopy">Data only: scenario phase, agent/threat positions, and validated control commands. No microphone, camera, participant name, or headset pose.</p>
              </section>

              <section className="export-row">
                <div><strong>{logCount}</strong><span>bounded log rows</span></div>
                <button className="text-button" type="button" disabled={!logCount} onClick={exportLog}>Download CSV ↓</button>
              </section>
            </aside>
          </div>
        </section>
      )}

      {view === "companion" && (
        <section className="workspace-shell companion-shell">
          <header className="workspace-heading">
            <div><p className="eyebrow"><span /> Browser companion</p><h1>Observe the scene live</h1></div>
            <div className="support-chip"><span className={receiverState.phase === "live" ? "live-dot" : "idle-dot"} />{receiverState.phase}</div>
          </header>

          <div className="companion-layout">
            <section className="map-card">
              <TopdownScene snapshot={remoteScene} stale={receiverState.phase === "stale"} />
              <div className="map-legend"><span className="legend-viewer">Observer</span><span className="legend-agent">Agent</span><span className="legend-threat">Threat</span></div>
            </section>

            <aside className="control-stack">
              <section className="control-card">
                <div className="card-heading"><div><span>01</span><h2>Connection</h2></div><small className={receiverState.phase === "live" ? "online" : ""}>{receiverState.route}{receiverState.rttMs ? ` · ${receiverState.rttMs} ms` : ""}</small></div>
                {receiverState.phase === "idle" || receiverState.phase === "error" ? (
                  <button className="button primary" type="button" onClick={() => void startDiscovery()}>Connect to a headset scene</button>
                ) : (
                  <button className="button ghost" type="button" onClick={() => void receiverRef.current?.stop()}>Disconnect</button>
                )}
                {receiverState.sources.length > 1 && (
                  <label className="source-select">Scene source
                    <select value={receiverState.selectedStreamId} onChange={(event) => void receiverRef.current?.selectSource(event.target.value)}>
                      <option value="">Choose a scene…</option>
                      {receiverState.sources.map((source) => <option key={source.streamId} value={source.streamId}>{source.label}</option>)}
                    </select>
                  </label>
                )}
                <p className="status-line" role="status">{companionStatus}</p>
              </section>

              <section className="control-card live-summary">
                <div className="card-heading"><div><span>02</span><h2>Readback</h2></div><small>{remoteScene?.sessionId ?? "No session"}</small></div>
                <dl>
                  <div><dt>Phase</dt><dd>{remoteScene ? phaseLabel(remoteScene.phase) : "—"}</dd></div>
                  <div><dt>Elapsed</dt><dd>{remoteScene ? `${(remoteScene.elapsedMs / 1_000).toFixed(1)} s` : "—"}</dd></div>
                  <div><dt>Threat distance</dt><dd>{remoteScene ? `${remoteScene.threat.distance.toFixed(2)} m` : "—"}</dd></div>
                  <div><dt>Agents afraid</dt><dd>{remoteScene ? `${remoteScene.agents.filter((agent) => agent.expression === "afraid").length} / ${remoteScene.agents.length}` : "—"}</dd></div>
                  <div><dt>Frame age</dt><dd>{receiverState.packetAgeMs === undefined ? "—" : `${Math.round(receiverState.packetAgeMs)} ms`}</dd></div>
                </dl>
              </section>

              <section className="control-card">
                <div className="card-heading"><div><span>03</span><h2>Remote controls</h2></div><small>{pendingCommand ? "Awaiting readback" : "Ready"}</small></div>
                <div className="button-grid">
                  <button className="button primary" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: "start" })}>Start</button>
                  <button className="button danger" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: remoteScene?.paused ? "resume" : "pause" })}>{remoteScene?.paused ? "Resume" : "Pause now"}</button>
                  <button className="button ghost" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: "reset" })}>Reset</button>
                </div>
                <div className="field-grid remote-fields">
                  <label>Threat
                    <select value={remoteScene?.config.threatKind ?? "tiger"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete")} onChange={(event) => sendCommand({ action: "set-threat", value: event.target.value as ThreatKind })}>
                      <option value="tiger">Stylized tiger</option><option value="angry-agent">Angry agent</option>
                    </select>
                  </label>
                  <label>Intensity
                    <select value={remoteScene?.config.intensity ?? "gentle"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete")} onChange={(event) => sendCommand({ action: "set-intensity", value: event.target.value as Intensity })}>
                      <option value="gentle">Gentle</option><option value="standard">Standard</option>
                    </select>
                  </label>
                </div>
                <p className="microcopy">A command is complete only when its request ID returns in a headset-owned scene frame.</p>
              </section>

              <section className="privacy-card">
                <strong>VDO.Ninja data link</strong>
                <p>The public discovery room uses third-party signaling and STUN/TURN. WebRTC peers may learn IP addresses; relay routes can add latency. The app requests no media tracks.</p>
              </section>
            </aside>
          </div>
        </section>
      )}

      <footer><span>Social Threat Lab · schema v1</span><span>Procedural stimulus · local study logging · VDO.Ninja SDK 1.5.5</span></footer>
    </main>
  );
}
