"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { XrSceneHandle } from "./XrScene";
import { ParticipantScene2D } from "./ParticipantScene2D";
import { TopdownScene } from "./TopdownScene";
import {
  evaluateScenario,
  isScenarioComplete,
  scenarioDurationMs,
  type AgentStyle,
  type Intensity,
  type ScenarioConfig,
  type SceneMode,
  type SceneSnapshot,
  type ThreatKind,
} from "../lib/scenario";
import {
  SceneBroadcaster,
  SceneReceiver,
  type CommandReceipt,
  type HostRuntimeReadback,
  type ReceiptStatus,
  type SceneCommand,
  type XrRuntimePhase,
} from "../lib/scene-sync";
import { SpatialAudioEngine } from "../lib/spatial-audio";

type AppView = "landing" | "trial" | "companion";

const XrScene = lazy(() => import("./XrScene"));

const DEFAULT_CONFIG: ScenarioConfig = {
  threatKind: "shadow",
  agentStyle: "minimal",
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
  schema_version: 2;
  session_id: string;
  client_time_iso: string;
  event: string;
  source: "trial" | "companion" | "local" | "xr-controller" | "xr-system";
  elapsed_ms: number;
  phase: string;
  running: boolean;
  paused: boolean;
  threat_kind: string;
  threat_distance_m: number;
  request_id: string;
  command_action: string;
  receipt_status: string;
  receipt_reason: string;
  xr_phase: XrRuntimePhase;
  xr_mode: SceneMode | "";
  scene_json: string;
}

interface PendingXrRequest {
  requestId: string;
  mode: SceneMode;
}

interface ControlLogDetail {
  requestId?: string;
  action?: SceneCommand["action"];
  status?: ReceiptStatus;
  reason?: string;
}

interface PendingOperatorCommand {
  requestId: string;
  action: SceneCommand["action"];
  late: boolean;
}

const ignoreFrame: (time: number) => void = () => undefined;
const ignoreReady: (ready: boolean) => void = () => undefined;
const ignoreSessionChange: (active: boolean, mode?: SceneMode) => void = () => undefined;
const ignoreStatus: (message: string) => void = () => undefined;
const ignoreRequest = () => undefined;

function Nav({ current, onNavigate }: { current: AppView; onNavigate(view: AppView): void }) {
  return (
    <nav className="top-nav" aria-label="Application views">
      <button className="brand" type="button" onClick={() => onNavigate("landing")}>
        <span className="brand-mark" aria-hidden="true">ST</span>
        <span>Social Threat Lab <small>WebXR prototype</small></span>
      </button>
      <div className="nav-links">
        <button type="button" aria-current={current === "trial" ? "page" : undefined} onClick={() => onNavigate("trial")}>2D trial</button>
        <button type="button" aria-current={current === "companion" ? "page" : undefined} onClick={() => onNavigate("companion")}>Companion view</button>
      </div>
    </nav>
  );
}

export default function StudyApp() {
  const [view, setView] = useState<AppView>("landing");
  const [headsetHost, setHeadsetHost] = useState(false);
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [sessionId, setSessionId] = useState("session_preview");
  const runtimeRef = useRef({ elapsedMs: 0, running: false, paused: false, lastFrameAt: 0, lastCommandId: undefined as string | undefined });
  const [scene, setScene] = useState(() => evaluateScenario(DEFAULT_CONFIG, 0, "session_preview"));
  const configRef = useRef(config);
  const sessionIdRef = useRef(sessionId);
  const sceneRef = useRef(scene);
  const xrRef = useRef<XrSceneHandle>(null);
  const [audioEngine] = useState(() => new SpatialAudioEngine());
  const [xrActive, setXrActive] = useState(false);
  const [xrEngineReady, setXrEngineReady] = useState(false);
  const [showXrPreview, setShowXrPreview] = useState(false);
  const [xrStatus, setXrStatus] = useState("Preparing the optional 3D engine…");
  const [xrSupport, setXrSupport] = useState({ vr: false, ar: false, checked: false });
  const [xrPhase, setXrPhase] = useState<XrRuntimePhase>("inline");
  const [activeXrMode, setActiveXrMode] = useState<SceneMode | undefined>(undefined);
  const [pendingXrRequest, setPendingXrRequest] = useState<PendingXrRequest | undefined>(undefined);
  const [hostRevision, setHostRevision] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioStatus, setAudioStatus] = useState("Audio is off by default. Immersive VR always starts silent.");
  const [broadcastState, setBroadcastState] = useState<Record<string, unknown>>({ phase: "idle", listenerCount: 0 });
  const broadcasterRef = useRef<SceneBroadcaster | undefined>(undefined);
  const logsRef = useRef<LogRow[]>([]);
  const [logCount, setLogCount] = useState(0);
  const lastSampleAtRef = useRef(-Infinity);
  const lastPhaseRef = useRef(scene.phase);
  const headsetHostRef = useRef(false);
  const pageVisibilityRef = useRef<"visible" | "hidden">("visible");
  const hostRevisionRef = useRef(0);
  const xrActiveRef = useRef(false);
  const xrEngineReadyRef = useRef(false);
  const xrSupportRef = useRef(xrSupport);
  const xrPhaseRef = useRef<XrRuntimePhase>("inline");
  const activeXrModeRef = useRef<SceneMode | undefined>(undefined);
  const pendingXrRequestRef = useRef<PendingXrRequest | undefined>(undefined);
  const pendingXrExitRequestRef = useRef<string | undefined>(undefined);
  const xrFrameCountRef = useRef(0);
  const lastFrameGapLogAtRef = useRef(-Infinity);
  const receiptsRef = useRef<CommandReceipt[]>([]);

  const receiverRef = useRef<SceneReceiver | undefined>(undefined);
  const [receiverState, setReceiverState] = useState<ReturnType<SceneReceiver["snapshot"]>>({
    phase: "idle", sources: [], selectedStreamId: "", sourceLabel: "", latest: undefined,
    packetAgeMs: undefined, route: "unknown", rttMs: undefined,
  });
  const [pendingCommand, setPendingCommand] = useState<PendingOperatorCommand | undefined>(undefined);
  const [lastCommandReceipt, setLastCommandReceipt] = useState<CommandReceipt | undefined>(undefined);
  const [companionViewport, setCompanionViewport] = useState<"3d" | "topdown">("3d");
  const [companionStatus, setCompanionStatus] = useState("Companion mode connects automatically through the data-only VDO.Ninja link.");
  const autoDiscoveryStartedRef = useRef(false);

  const bumpHostRevision = useCallback(() => {
    hostRevisionRef.current = (hostRevisionRef.current + 1) >>> 0;
    setHostRevision(hostRevisionRef.current);
  }, []);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => {
    headsetHostRef.current = headsetHost;
    bumpHostRevision();
  }, [bumpHostRevision, headsetHost]);
  useEffect(() => {
    xrSupportRef.current = xrSupport;
    bumpHostRevision();
  }, [bumpHostRevision, xrSupport]);

  useEffect(() => {
    const updateVisibility = () => {
      const next = document.visibilityState === "hidden" ? "hidden" : "visible";
      if (pageVisibilityRef.current === next) return;
      pageVisibilityRef.current = next;
      bumpHostRevision();
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [bumpHostRevision]);

  useEffect(() => () => { void audioEngine.dispose(); }, [audioEngine]);

  useEffect(() => {
    if (!audioEnabled || xrActive) return;
    audioEngine.setListenerPose(0, 1.6, 0, 0, 0, -1, 0, 1, 0);
    audioEngine.update(scene);
  }, [audioEnabled, audioEngine, scene, xrActive]);

  const navigate = useCallback((next: AppView) => {
    setHeadsetHost(false);
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
      const isHeadset = value === "headset";
      setHeadsetHost(isHeadset);
      setView(value === "trial" || value === "companion" ? value : isHeadset ? "trial" : "landing");
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

  const appendLog = useCallback((event: string, source: LogRow["source"], snapshot = sceneRef.current, detail: ControlLogDetail = {}) => {
    const row: LogRow = {
      schema_version: 2,
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
      request_id: detail.requestId ?? "",
      command_action: detail.action ?? "",
      receipt_status: detail.status ?? "",
      receipt_reason: detail.reason ?? "",
      xr_phase: xrPhaseRef.current,
      xr_mode: activeXrModeRef.current ?? "",
      scene_json: JSON.stringify(snapshot),
    };
    logsRef.current.push(row);
    if (logsRef.current.length > 12_000) logsRef.current.splice(0, logsRef.current.length - 12_000);
    setLogCount(logsRef.current.length);
  }, []);

  const makeHostRuntime = useCallback((): HostRuntimeReadback => ({
    version: 1,
    revision: hostRevisionRef.current,
    pageVisibility: pageVisibilityRef.current,
    role: headsetHostRef.current ? "headset" : "participant",
    xr: {
      supportChecked: xrSupportRef.current.checked,
      vrSupported: xrSupportRef.current.vr,
      arSupported: xrSupportRef.current.ar,
      engineReady: xrEngineReadyRef.current,
      phase: xrPhaseRef.current,
      ...(activeXrModeRef.current ? { activeMode: activeXrModeRef.current } : {}),
      ...(pendingXrRequestRef.current ? {
        requestedMode: pendingXrRequestRef.current.mode,
        pendingRequestId: pendingXrRequestRef.current.requestId,
      } : {}),
      frameCount: xrFrameCountRef.current >>> 0,
    },
    receipts: receiptsRef.current,
  }), []);

  const recordReceipt = useCallback((receipt: CommandReceipt, snapshot = sceneRef.current) => {
    const next = [receipt, ...receiptsRef.current.filter((item) => item.requestId !== receipt.requestId)].slice(0, 16);
    receiptsRef.current = next;
    appendLog(`command_${receipt.status}`, "companion", snapshot, {
      requestId: receipt.requestId,
      action: receipt.action,
      status: receipt.status,
      reason: receipt.reason,
    });
    bumpHostRevision();
  }, [appendLog, bumpHostRevision]);

  const rebuildScene = useCallback((overrides: Partial<typeof runtimeRef.current> = {}) => {
    Object.assign(runtimeRef.current, overrides);
    const runtime = runtimeRef.current;
    const next = evaluateScenario(configRef.current, runtime.elapsedMs, sessionIdRef.current, runtime);
    sceneRef.current = next;
    setScene(next);
    return next;
  }, []);

  const startScenario = useCallback((source: LogRow["source"] = "local") => {
    if (audioEngine.enabled) void audioEngine.enable();
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
  }, [appendLog, audioEngine]);

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
    if (command.action !== "start") appendLog("command_received", "companion", sceneRef.current, { requestId: command.requestId, action: command.action });
    const reject = (reason: string, message: string) => recordReceipt({
      requestId: command.requestId,
      action: command.action,
      status: "rejected",
      reason,
      message,
    });
    const confirm = () => {
      const applied = rebuildScene({ lastCommandId: command.requestId });
      recordReceipt({ requestId: command.requestId, action: command.action, status: "confirmed" }, applied);
    };
    const runtime = runtimeRef.current;
    const runningTrial = runtime.running && !isScenarioComplete(sceneRef.current);

    if (command.action === "start") {
      if (runningTrial) return reject("invalid-state", "The trial is already running; use Resume if it is paused.");
      startScenario("companion");
      appendLog("command_received", "companion", sceneRef.current, { requestId: command.requestId, action: command.action });
      return confirm();
    }
    if (command.action === "pause") {
      if (!runningTrial || runtime.paused) return reject("invalid-state", "Pause requires an active, unpaused trial.");
      pauseScenario("companion");
      return confirm();
    }
    if (command.action === "resume") {
      if (!runningTrial || !runtime.paused) return reject("invalid-state", "Resume requires a paused trial.");
      pauseScenario("companion");
      return confirm();
    }
    if (command.action === "reset") {
      resetScenario("companion");
      return confirm();
    }
    if (command.action === "request-xr") {
      const supported = command.value === "virtual" ? xrSupportRef.current.vr : xrSupportRef.current.ar;
      if (!xrSupportRef.current.checked || !xrEngineReadyRef.current) {
        return reject("engine-not-ready", "The headset WebXR engine is not ready yet.");
      }
      if (!supported) return reject("unsupported-mode", "The requested immersive mode is not supported on the headset.");
      if (xrActiveRef.current || pendingXrRequestRef.current) return reject("invalid-state", "An immersive session or request is already active.");
      const pending = { requestId: command.requestId, mode: command.value };
      pendingXrRequestRef.current = pending;
      setPendingXrRequest(pending);
      xrPhaseRef.current = "awaiting-local-confirmation";
      setXrPhase("awaiting-local-confirmation");
      recordReceipt({
        requestId: command.requestId,
        action: command.action,
        status: "pending",
        reason: "local-confirmation-required",
        message: "Waiting for a trusted click or controller confirmation on the headset.",
      });
      setXrStatus(`Operator requests ${command.value === "virtual" ? "VR" : "passthrough MR"}. Confirm on this headset to enter.`);
      return;
    }
    if (command.action === "exit-xr") {
      if (!xrActiveRef.current || !xrRef.current || pendingXrExitRequestRef.current) {
        return reject("invalid-state", "There is no active immersive session to exit.");
      }
      pendingXrExitRequestRef.current = command.requestId;
      xrPhaseRef.current = "exiting";
      setXrPhase("exiting");
      recordReceipt({ requestId: command.requestId, action: command.action, status: "pending", message: "Waiting for the headset session-end event." });
      void xrRef.current.exit().catch((error) => {
        pendingXrExitRequestRef.current = undefined;
        xrPhaseRef.current = "error";
        setXrPhase("error");
        recordReceipt({
          requestId: command.requestId,
          action: command.action,
          status: "failed",
          reason: "session-end-failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });
      return;
    }

    const configLocked = runningTrial || xrActiveRef.current;
    if ((command.action === "set-threat" || command.action === "set-agent-style" || command.action === "set-intensity") && configLocked) {
      return reject("configuration-locked", "Threat, avatar, and intensity settings are locked while the trial or XR session is active.");
    }
    if (command.action === "set-loop" && runningTrial) return reject("configuration-locked", "Loop is locked while the trial is active.");
    if (command.action === "set-mode" && xrActiveRef.current) return reject("configuration-locked", "Scene mode is locked during an immersive session.");

    let nextConfig = configRef.current;
    if (command.action === "set-threat") nextConfig = { ...nextConfig, threatKind: command.value };
    else if (command.action === "set-agent-style") nextConfig = { ...nextConfig, agentStyle: command.value };
    else if (command.action === "set-intensity") nextConfig = { ...nextConfig, intensity: command.value };
    else if (command.action === "set-mode") nextConfig = { ...nextConfig, mode: command.value };
    else if (command.action === "set-loop") nextConfig = { ...nextConfig, loop: command.value };
    else return reject("invalid-state", "The command is not applicable in the current host state.");
    configRef.current = nextConfig;
    setConfig(nextConfig);
    const applied = evaluateScenario(nextConfig, runtime.elapsedMs, sessionIdRef.current, { ...runtime, lastCommandId: command.requestId });
    runtimeRef.current.lastCommandId = command.requestId;
    sceneRef.current = applied;
    setScene(applied);
    appendLog(`set_${command.action.replace("set-", "").replaceAll("-", "_")}`, "companion", applied, { requestId: command.requestId, action: command.action });
    recordReceipt({ requestId: command.requestId, action: command.action, status: "confirmed" }, applied);
  }, [appendLog, pauseScenario, rebuildScene, recordReceipt, resetScenario, startScenario]);

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
      setPendingCommand((current) => {
        if (!current) {
          setCompanionStatus((status) => status.startsWith("Command") || status.startsWith("Waiting")
            ? status
            : "Live scene and headset runtime readback received.");
          return current;
        }
        const receipt = detail.latest?.host.receipts.find((item) => item.requestId === current.requestId);
        if (!receipt) return current;
        setLastCommandReceipt(receipt);
        if (receipt.status === "pending") {
          setCompanionStatus(receipt.message ?? "Host accepted the command and is waiting for headset confirmation.");
          return current;
        }
        setCompanionStatus(receipt.message ?? (receipt.status === "confirmed"
          ? "Host readback confirmed the command."
          : `Host ${receipt.status} the command${receipt.reason ? `: ${receipt.reason}` : "."}`));
        return undefined;
      });
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

  const advanceScenarioFrame = useCallback((now: number) => {
    if (xrActiveRef.current) {
      xrFrameCountRef.current = (xrFrameCountRef.current + 1) >>> 0;
      if (xrFrameCountRef.current % 15 === 0) bumpHostRevision();
    }
    const runtime = runtimeRef.current;
    if (!runtime.lastFrameAt) runtime.lastFrameAt = now;
    const rawDelta = Math.max(0, now - runtime.lastFrameAt);
    const delta = Math.min(100, rawDelta);
    runtime.lastFrameAt = now;
    if (runtime.running && rawDelta > 250 && now - lastFrameGapLogAtRef.current > 1_000) {
      lastFrameGapLogAtRef.current = now;
      appendLog("frame_gap_clamped", xrActiveRef.current ? "xr-system" : "trial", sceneRef.current);
    }
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
  }, [appendLog, bumpHostRevision]);

  useEffect(() => {
    let animationId = 0;
    const tick = (now: number) => {
      if (!xrActiveRef.current) advanceScenarioFrame(now);
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [advanceScenarioFrame]);

  useEffect(() => {
    broadcasterRef.current?.offer(scene, makeHostRuntime());
    if (scene.elapsedMs - lastSampleAtRef.current >= 100 || scene.phase !== lastPhaseRef.current) {
      appendLog("sample", "trial", scene);
      lastSampleAtRef.current = scene.elapsedMs;
      lastPhaseRef.current = scene.phase;
    }
  }, [appendLog, hostRevision, makeHostRuntime, scene]);

  const updateConfig = <K extends keyof ScenarioConfig>(key: K, value: ScenarioConfig[K]) => {
    setConfig((current) => {
      const next = { ...current, [key]: value };
      configRef.current = next;
      return next;
    });
  };

  const silenceSpatialAudio = useCallback(() => {
    // The engine clears its graph synchronously before awaiting AudioContext.close(),
    // so a restored Quest Browser tab cannot carry prior 2D audio into WebXR.
    void audioEngine.dispose();
    setAudioEnabled(false);
    setAudioStatus("Audio is off by default. Immersive VR always starts silent.");
  }, [audioEngine]);

  const toggleSpatialAudio = async () => {
    if (xrActiveRef.current) {
      silenceSpatialAudio();
      return;
    }
    if (audioEnabled) {
      await audioEngine.dispose();
      setAudioEnabled(false);
      setAudioStatus("Audio is off by default. Immersive VR always starts silent.");
      return;
    }
    try {
      await audioEngine.enable();
      audioEngine.update(sceneRef.current);
      setAudioEnabled(true);
      setAudioStatus("HRTF audio enabled for 2D only · begin at low device volume.");
    } catch (error) {
      setAudioStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const startBroadcast = useCallback(async () => {
    try {
      await broadcasterRef.current?.start();
      broadcasterRef.current?.offer(sceneRef.current, makeHostRuntime());
    } catch (error) {
      setBroadcastState({ phase: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, [makeHostRuntime]);

  const startDiscovery = useCallback(async () => {
    try { await receiverRef.current?.startDiscovery(); }
    catch (error) { setCompanionStatus(error instanceof Error ? error.message : String(error)); }
  }, []);

  useEffect(() => {
    if (view !== "companion") {
      autoDiscoveryStartedRef.current = false;
      return;
    }
    if (autoDiscoveryStartedRef.current) return;
    autoDiscoveryStartedRef.current = true;
    setCompanionStatus("Connecting automatically to the VDO.Ninja scene room…");
    void startDiscovery();
  }, [startDiscovery, view]);

  useEffect(() => {
    if (!headsetHost) return;
    const timer = window.setTimeout(() => { void startBroadcast(); }, 0);
    return () => window.clearTimeout(timer);
  }, [headsetHost, startBroadcast]);

  const start2D = useCallback(() => {
    void startBroadcast();
    if (runtimeRef.current.running && runtimeRef.current.paused && !isScenarioComplete(sceneRef.current)) pauseScenario("trial");
    else startScenario("trial");
    setXrStatus("2D trial running. Use Continue in immersive 3D at any time.");
  }, [pauseScenario, startBroadcast, startScenario]);

  const enterImmersive = useCallback(async (mode: SceneMode, requestId?: string) => {
    if (requestId) {
      const pending = pendingXrRequestRef.current;
      if (!pending || pending.requestId !== requestId || pending.mode !== mode || xrPhaseRef.current !== "awaiting-local-confirmation") return;
    }
    if (!xrEngineReady || !xrRef.current) {
      setXrStatus("The 3D engine is still preparing. Try the immersive button again in a moment.");
      if (requestId) {
        pendingXrRequestRef.current = undefined;
        setPendingXrRequest(undefined);
        xrPhaseRef.current = "error";
        setXrPhase("error");
        recordReceipt({ requestId, action: "request-xr", status: "failed", reason: "engine-not-ready", message: "The headset WebXR engine was not ready." });
      }
      return;
    }

    // Do not await the data link before requestSession: the WebXR request must
    // remain directly inside this user gesture on Quest Browser.
    // Audio teardown is also dispatched without awaiting so requestSession
    // retains the same trusted activation while immersive entry starts silent.
    silenceSpatialAudio();
    void startBroadcast();
    xrPhaseRef.current = "entering";
    setXrPhase("entering");
    bumpHostRevision();
    if (requestId) recordReceipt({
      requestId,
      action: "request-xr",
      status: "pending",
      message: "Local confirmation received; waiting for the headset session-start event.",
    });
    try {
      await xrRef.current.enter(mode);
      const nextConfig = { ...configRef.current, mode };
      configRef.current = nextConfig;
      setConfig(nextConfig);
      setShowXrPreview(true);
      if (!runtimeRef.current.running || isScenarioComplete(sceneRef.current)) startScenario(requestId ? "companion" : "trial");
      else if (runtimeRef.current.paused) pauseScenario(requestId ? "companion" : "trial");
      setXrStatus(`${mode === "passthrough" ? "Mixed-reality" : "Immersive 3D"} trial running silently. A resumes/restarts; either trigger pauses.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setXrStatus(message);
      xrPhaseRef.current = "error";
      setXrPhase("error");
      if (requestId) {
        pendingXrRequestRef.current = undefined;
        setPendingXrRequest(undefined);
        recordReceipt({ requestId, action: "request-xr", status: "failed", reason: "request-session-failed", message });
      } else bumpHostRevision();
    }
  }, [bumpHostRevision, pauseScenario, recordReceipt, silenceSpatialAudio, startBroadcast, startScenario, xrEngineReady]);

  const dismissPendingXr = useCallback(() => {
    const pending = pendingXrRequestRef.current;
    if (!pending || xrPhaseRef.current !== "awaiting-local-confirmation") return;
    pendingXrRequestRef.current = undefined;
    setPendingXrRequest(undefined);
    xrPhaseRef.current = "inline";
    setXrPhase("inline");
    setXrStatus("The operator XR request was dismissed on the headset.");
    recordReceipt({
      requestId: pending.requestId,
      action: "request-xr",
      status: "rejected",
      reason: "local-declined",
      message: "The headset user dismissed the immersive request.",
    });
  }, [recordReceipt]);

  const sendCommand = (command: Parameters<SceneReceiver["send"]>[0]) => {
    const requestId = receiverRef.current?.send(command) ?? "";
    if (requestId) {
      setLastCommandReceipt(undefined);
      setPendingCommand({ requestId, action: command.action, late: false });
      setCompanionStatus("Command sent; waiting for host readback…");
      window.setTimeout(() => {
        setPendingCommand((current) => {
          if (current?.requestId !== requestId) return current;
          setCompanionStatus("Command is late; it remains tracked and will reconcile if host readback arrives.");
          return { ...current, late: true };
        });
      }, 2_500);
    }
  };

  const exportLog = () => {
    const columns: Array<keyof LogRow> = [
      "schema_version", "session_id", "client_time_iso", "event", "source", "elapsed_ms", "phase",
      "running", "paused", "threat_kind", "threat_distance_m", "request_id", "command_action",
      "receipt_status", "receipt_reason", "xr_phase", "xr_mode", "scene_json",
    ];
    const csv = [columns.join(","), ...logsRef.current.map((row) => columns.map((column) => quoteCsv(row[column])).join(","))].join("\n");
    downloadText(`${scene.sessionId}.csv`, csv, "text/csv;charset=utf-8");
  };

  const remoteScene = receiverState.latest?.snapshot;
  const remoteHost = receiverState.latest?.host;
  const broadcastPhase = String(broadcastState.phase ?? "idle");
  const listenerCount = Number(broadcastState.listenerCount ?? 0);
  const connectionReadout = broadcastPhase === "broadcasting"
    ? `${listenerCount} companion${listenerCount === 1 ? "" : "s"} · ${String(broadcastState.route ?? "waiting")}`
    : broadcastPhase;
  const phaseProgress = Math.min(100, (scene.elapsedMs / scenarioDurationMs(scene.config.intensity)) * 100);
  const activeDialogue = scene.audioCues.find((cue) => cue.sourceId !== "threat");

  const supportLabel = useMemo(() => {
    if (!xrSupport.checked) return "Checking immersive support…";
    if (!xrSupport.vr && !xrSupport.ar) return "2D trial ready · immersive XR unavailable here";
    return `${xrSupport.vr ? "VR ready" : "VR unavailable"} · ${xrSupport.ar ? "MR ready" : "MR unavailable"}`;
  }, [xrSupport]);
  const shouldMountXr = showXrPreview || xrSupport.vr || xrSupport.ar;

  const handleSessionChange = useCallback((active: boolean, mode?: SceneMode) => {
    xrActiveRef.current = active;
    setXrActive(active);
    if (active) {
      const resolvedMode = mode ?? configRef.current.mode;
      activeXrModeRef.current = resolvedMode;
      setActiveXrMode(resolvedMode);
      xrFrameCountRef.current = 0;
      xrPhaseRef.current = "active";
      setXrPhase("active");
      appendLog("xr_session_start", "xr-system");
      const pending = pendingXrRequestRef.current;
      pendingXrRequestRef.current = undefined;
      setPendingXrRequest(undefined);
      if (pending) {
        const applied = rebuildScene({ lastCommandId: pending.requestId, lastFrameAt: performance.now() });
        recordReceipt({ requestId: pending.requestId, action: "request-xr", status: "confirmed" }, applied);
      } else bumpHostRevision();
      return;
    }
    activeXrModeRef.current = undefined;
    setActiveXrMode(undefined);
    xrPhaseRef.current = "inline";
    setXrPhase("inline");
    appendLog("xr_session_end", "xr-system");
    const exitRequestId = pendingXrExitRequestRef.current;
    pendingXrExitRequestRef.current = undefined;
    if (exitRequestId) {
      const applied = rebuildScene({ lastCommandId: exitRequestId, lastFrameAt: performance.now() });
      recordReceipt({ requestId: exitRequestId, action: "exit-xr", status: "confirmed" }, applied);
    } else bumpHostRevision();
  }, [appendLog, bumpHostRevision, rebuildScene, recordReceipt]);
  const handleXrStatus = useCallback((message: string) => setXrStatus(message), []);
  const handleXrReady = useCallback((ready: boolean) => {
    xrEngineReadyRef.current = ready;
    setXrEngineReady(ready);
    bumpHostRevision();
    if (ready) setXrStatus((current) => current.startsWith("Preparing") ? "3D engine ready. Start immersive 3D directly or show the browser preview." : current);
  }, [bumpHostRevision]);
  const handleXrStart = useCallback(() => {
    if (!runtimeRef.current.running || isScenarioComplete(sceneRef.current)) {
      startScenario("xr-controller");
      setXrStatus("Scenario started or restarted with the right-controller A button.");
    } else if (runtimeRef.current.paused) {
      pauseScenario("xr-controller");
    }
  }, [pauseScenario, startScenario]);
  const handleXrPause = useCallback(() => {
    if (runtimeRef.current.running && !runtimeRef.current.paused) pauseScenario("xr-controller");
  }, [pauseScenario]);

  return (
    <main>
      <Nav current={view} onNavigate={navigate} />

      {view === "landing" && (
        <section className="landing-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Minimal social-agent study kit</p>
            <h1>Run the social encounter<br />on any screen.</h1>
            <p className="hero-lede">
              A front-facing crowd of twelve game-like or human avatars wanders in six dyads, exchanges gaze, and trades friendly spatial tones. A distant threat approaches and becomes more visible;
              alarm spreads unevenly through the group before they avoid it. Run the complete 2D trial on a phone or browser, with optional spatial audio, VR, and passthrough MR.
            </p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => navigate("trial")}>Start the 2D trial <span>→</span></button>
              <button className="button ghost" type="button" onClick={() => navigate("companion")}>Open top-down companion</button>
            </div>
            <dl className="hero-facts">
              <div><dt>2D</dt><dd>phone first</dd></div>
              <div><dt>6</dt><dd>social dyads</dd></div>
              <div><dt>1.8 m</dt><dd>hard threat limit</dd></div>
            </dl>
          </div>
          <div className="hero-diagram" aria-label="Diagram showing a crowd of twelve agents in front of a viewer while a distant threat approaches">
            <div className="radar-ring ring-a" />
            <div className="radar-ring ring-b" />
            <div className="hero-viewer">YOU</div>
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map((name) => <div key={name} className={`hero-agent agent-${name}`}>•</div>)}
            <div className="hero-threat"><span>⌁</span><small>THREAT</small></div>
            <div className="approach-line" />
          </div>
          <p className="landing-note">
            This is an experimental stimulus builder—not a validated diagnostic or a pre-validated social-threat paradigm.
            Pilot-test recognition, intensity, timing, and comfort with your target population before data collection.
          </p>
        </section>
      )}

      {view === "trial" && (
        <section className="workspace-shell">
          <header className="workspace-heading">
            <div><p className="eyebrow"><span /> {headsetHost ? "Dedicated headset host" : "Phone-ready 2D scene"}</p><h1>Run the encounter</h1></div>
            <div className="support-chip"><span className="live-dot" />{headsetHost ? `Operator link ${broadcastPhase}` : "2D ready on this device · XR optional"}</div>
          </header>

          {pendingXrRequest && xrPhase === "awaiting-local-confirmation" && (
            <section className="xr-confirmation" role="alertdialog" aria-live="assertive" aria-label="Operator immersive request">
              <div>
                <p className="eyebrow"><span /> Local headset confirmation required</p>
                <h2>Operator requests {pendingXrRequest.mode === "virtual" ? "immersive VR" : "passthrough MR"}</h2>
                <p>WebXR requires a trusted action on this headset. Confirm only when the participant and physical space are ready.</p>
              </div>
              <div className="xr-confirmation-actions">
                <button className="button primary" type="button" onClick={() => void enterImmersive(pendingXrRequest.mode, pendingXrRequest.requestId)}>Confirm and enter</button>
                <button className="button danger" type="button" onClick={dismissPendingXr}>Dismiss request</button>
              </div>
            </section>
          )}

          <div className="trial-layout">
            <div className="trial-stage">
              <section className="scene-panel participant-panel">
                <ParticipantScene2D snapshot={scene} />
                <div className="scene-overlay top-left" aria-live="polite">
                  <span className={`status-dot ${scene.paused ? "paused" : scene.running ? "active" : ""}`} />
                  <strong>{phaseLabel(scene.phase)}</strong>
                  <span>{(scene.elapsedMs / 1_000).toFixed(1)} s</span>
                </div>
                <div className="scene-overlay bottom-progress"><span style={{ width: `${phaseProgress}%` }} /></div>
                <div className="scene-overlay safety-readout">Threat <strong>{scene.threat.distance.toFixed(1)} m</strong></div>
                {activeDialogue && <div className="scene-overlay dialogue-readout"><strong>{activeDialogue.sourceId.replace("agent-", "Agent ").toUpperCase()}</strong><span>{activeDialogue.text}</span></div>}
              </section>

              <section className="trial-control-dock" aria-label="Trial controls">
                <div className="trial-launch-grid">
                  <button className="button primary" type="button" onClick={start2D}>{scene.paused ? "Resume 2D" : scene.phase === "complete" ? "Run 2D again" : scene.running ? "Restart 2D" : "Start 2D"}</button>
                  <button className="button xr-start" type="button" disabled={!xrSupport.vr || !xrEngineReady || xrActive || Boolean(pendingXrRequest)} onClick={() => void enterImmersive("virtual")}>{scene.running && !isScenarioComplete(scene) ? "Continue in immersive 3D" : "Start immersive 3D"}</button>
                </div>
                <div className="trial-transport">
                  <button className="button danger" type="button" disabled={!scene.running || isScenarioComplete(scene)} onClick={() => pauseScenario("trial")}>{scene.paused ? "Resume" : "Pause"}</button>
                  <button className="button ghost" type="button" onClick={() => resetScenario("trial")}>Reset</button>
                </div>
                <p className="trial-start-note">Contains an approaching threat and spatial sound. Start at low volume; either view can be stopped at any time.</p>
              </section>
            </div>

            <aside className="control-stack">
              <section className="control-card">
                <div className="card-heading"><div><span>01</span><h2>2D stimulus</h2></div><small>Configure before starting</small></div>
                <div className="field-grid">
                  <label>Threat
                    <select value={config.threatKind} disabled={xrActive || (scene.running && !isScenarioComplete(scene))} onChange={(event) => updateConfig("threatKind", event.target.value as ThreatKind)}>
                      <option value="shadow">Shrouded shadow</option>
                      <option value="angry-agent">Angry agent</option>
                      <option value="spider">Huntsman spider</option>
                    </select>
                  </label>
                  <label>Crowd avatars
                    <select value={config.agentStyle} disabled={xrActive || (scene.running && !isScenarioComplete(scene))} onChange={(event) => updateConfig("agentStyle", event.target.value as AgentStyle)}>
                      <option value="minimal">Minimal game-like agents</option>
                      <option value="human">Human glTF avatars</option>
                    </select>
                  </label>
                  <label>Intensity
                    <select value={config.intensity} disabled={xrActive || (scene.running && !isScenarioComplete(scene))} onChange={(event) => updateConfig("intensity", event.target.value as Intensity)}>
                      <option value="gentle">Gentle · 18 s approach</option>
                      <option value="standard">Standard · 12 s approach</option>
                    </select>
                  </label>
                  <label>2D background
                    <select value={config.mode} disabled={xrActive} onChange={(event) => updateConfig("mode", event.target.value as SceneMode)}>
                      <option value="virtual">Dusk clearing</option>
                      <option value="passthrough">Neutral study grid</option>
                    </select>
                  </label>
                  <label className="check-field"><input type="checkbox" checked={config.loop} disabled={scene.running && !isScenarioComplete(scene)} onChange={(event) => updateConfig("loop", event.target.checked)} />Loop after completion</label>
                </div>
                <p className="microcopy">Minimal and 2D human-proportioned faces share an evidence-grounded SVG morph system; procedural 3D faces wrap onto the head sphere rather than a flat plate. The exact faces and transitions still require target-population validation. The human 3D option uses the CC BY 4.0 Cesium Man model. Avatar style does not change positions, timing, or behavior.</p>
              </section>

              <section className="control-card audio-card">
                <div className="card-heading"><div><span>02</span><h2>Spatial sound</h2></div><small className={audioEnabled ? "online" : ""}>{audioEnabled ? "HRTF on" : "Off"}</small></div>
                <p className="addon-copy">Dyads exchange consonant friendly-tone prototypes. The threat adds a spatially looming inharmonic drone, 47/83 Hz rough modulation, accelerating low pulses, and—on the spider—brief chitter-like clicks.</p>
                <button className={`button ${audioEnabled ? "ghost" : "link-button"}`} type="button" disabled={xrActive} onClick={() => void toggleSpatialAudio()}>{audioEnabled ? "Disable spatial audio" : "Enable spatial audio for 2D"}</button>
                <p className="status-line" role="status">{audioStatus}</p>
                <p className="microcopy">Immersive VR/MR starts and remains silent; entering XR closes any earlier 2D audio graph. Optional 2D audio still requires a deliberate click. Use headphones, begin at low volume, and measure actual output before participant use.</p>
              </section>

              <section className="control-card xr-addon-card">
                <div className="card-heading"><div><span>03</span><h2>Optional 3D / WebXR</h2></div><small>{xrActive ? `${activeXrMode === "passthrough" ? "MR" : "VR"} active` : xrPhase === "awaiting-local-confirmation" ? "Awaiting confirmation" : supportLabel}</small></div>
                <p className="addon-copy">The 3D engine prepares automatically. Starting immersive mode directly enters VR and starts or continues the same trial clock.</p>
                <div className={showXrPreview ? "mini-xr-preview" : "xr-prewarm"} aria-hidden={!showXrPreview}>
                  {shouldMountXr && (
                    <Suspense fallback={<div className="scene-loading" role="status">Preparing 3D scene…</div>}>
                      <XrScene
                        ref={xrRef}
                        snapshot={scene}
                        audioEngine={audioEnabled && !xrActive ? audioEngine : undefined}
                        onFrame={advanceScenarioFrame}
                        onReady={handleXrReady}
                        onStartRequest={handleXrStart}
                        onPauseRequest={handleXrPause}
                        onSessionChange={handleSessionChange}
                        onStatus={handleXrStatus}
                      />
                    </Suspense>
                  )}
                </div>
                <button className="button link-button" type="button" aria-expanded={showXrPreview} disabled={xrActive} onClick={() => setShowXrPreview((current) => !current)}>{showXrPreview ? "Hide browser 3D preview" : "Show browser 3D preview"}</button>
                <div className="immersive-buttons">
                  <button className="button xr" type="button" disabled={!xrSupport.vr || !xrEngineReady || xrActive || Boolean(pendingXrRequest)} onClick={() => void enterImmersive("virtual")}><span>VR</span> {scene.running && !isScenarioComplete(scene) ? "Continue in VR" : "Start in VR"}</button>
                  <button className="button xr" type="button" disabled={!xrSupport.ar || !xrEngineReady || xrActive || Boolean(pendingXrRequest)} onClick={() => void enterImmersive("passthrough")}><span>MR</span> {scene.running && !isScenarioComplete(scene) ? "Continue in passthrough" : "Start in passthrough"}</button>
                </div>
                <p className="status-line" role="status">{xrStatus}</p>
              </section>

              <section className="control-card link-card">
                <div className="card-heading"><div><span>04</span><h2>Companion link</h2></div><small className={broadcastPhase === "broadcasting" ? "online" : ""}>{connectionReadout}</small></div>
                {broadcastPhase !== "broadcasting" ? (
                  <button className="button link-button" type="button" onClick={() => void startBroadcast()}>Start companion link now</button>
                ) : (
                  <button className="button ghost" type="button" onClick={() => void broadcasterRef.current?.stop()}>Stop broadcast</button>
                )}
                <a className="button link-button companion-open" href="?view=companion" target="_blank" rel="noreferrer">Open companion in another browser</a>
                <p className="status-line">The data link starts automatically with Start 2D or Start immersive 3D; the companion begins discovery when opened.</p>
                <p className="microcopy">Data only: scenario phase, agent/threat positions, and allowlisted control commands. No microphone, camera, participant name, or device pose.</p>
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
              <div className="viewport-heading">
                <div><strong>Authoritative scene-state viewport</strong><small>Not headset video or pose</small></div>
                <div className="viewport-tabs" aria-label="Operator viewport mode">
                  <button type="button" aria-pressed={companionViewport === "3d"} onClick={() => setCompanionViewport("3d")}>3D</button>
                  <button type="button" aria-pressed={companionViewport === "topdown"} onClick={() => setCompanionViewport("topdown")}>Top-down</button>
                </div>
              </div>
              {companionViewport === "topdown" ? (
                <TopdownScene snapshot={remoteScene} stale={receiverState.phase === "stale"} />
              ) : remoteScene ? (
                <div className="operator-xr-viewport">
                  <Suspense fallback={<div className="scene-loading" role="status">Preparing 3D operator viewport…</div>}>
                    <XrScene
                      snapshot={remoteScene}
                      onFrame={ignoreFrame}
                      onReady={ignoreReady}
                      onStartRequest={ignoreRequest}
                      onPauseRequest={ignoreRequest}
                      onSessionChange={ignoreSessionChange}
                      onStatus={ignoreStatus}
                    />
                  </Suspense>
                  {receiverState.phase === "stale" && <div className="viewport-stale" role="status">Scene stream stale · holding the last authoritative state</div>}
                </div>
              ) : (
                <div className="operator-empty">Waiting for the headset scene stream…</div>
              )}
              {companionViewport === "topdown" && <div className="map-legend"><span className="legend-viewer">Observer</span><span className="legend-agent">Agent</span><span className="legend-threat">Threat</span></div>}
            </section>

            <aside className="control-stack">
              <section className="control-card">
                <div className="card-heading"><div><span>01</span><h2>Connection</h2></div><small className={receiverState.phase === "live" ? "online" : ""}>{receiverState.route}{receiverState.rttMs ? ` · ${receiverState.rttMs} ms` : ""}</small></div>
                {receiverState.phase === "idle" || receiverState.phase === "error" ? (
                  <button className="button primary" type="button" onClick={() => void startDiscovery()}>Reconnect via VDO.Ninja</button>
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
                  <div><dt>Host role</dt><dd>{remoteHost?.role ?? "—"}</dd></div>
                  <div><dt>Host page</dt><dd>{remoteHost?.pageVisibility ?? "—"}</dd></div>
                  <div><dt>XR runtime</dt><dd>{remoteHost ? `${remoteHost.xr.phase}${remoteHost.xr.activeMode ? ` · ${remoteHost.xr.activeMode}` : ""}` : "—"}</dd></div>
                  <div><dt>XR engine</dt><dd>{remoteHost ? `${remoteHost.xr.engineReady ? "ready" : "loading"} · VR ${remoteHost.xr.vrSupported ? "yes" : "no"} · MR ${remoteHost.xr.arSupported ? "yes" : "no"}` : "—"}</dd></div>
                  <div><dt>XR frames</dt><dd>{remoteHost?.xr.frameCount ?? "—"}</dd></div>
                  <div><dt>Frame age</dt><dd>{receiverState.packetAgeMs === undefined ? "—" : `${Math.round(receiverState.packetAgeMs)} ms`}</dd></div>
                </dl>
              </section>

              <section className="control-card">
                <div className="card-heading"><div><span>03</span><h2>Remote controls</h2></div><small>{pendingCommand ? pendingCommand.late ? "Late · reconciling" : "Awaiting readback" : "Ready"}</small></div>
                <div className="button-grid">
                  <button className="button primary" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: "start" })}>Start</button>
                  <button className="button danger" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: remoteScene?.paused ? "resume" : "pause" })}>{remoteScene?.paused ? "Resume" : "Pause now"}</button>
                  <button className="button ghost" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand)} onClick={() => sendCommand({ action: "reset" })}>Reset</button>
                </div>
                <div className="button-grid xr-remote-buttons">
                  <button className="button xr" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || !remoteHost?.xr.engineReady || !remoteHost.xr.vrSupported || remoteHost.xr.phase === "active"} onClick={() => sendCommand({ action: "request-xr", value: "virtual" })}>Request VR</button>
                  <button className="button xr" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || !remoteHost?.xr.engineReady || !remoteHost.xr.arSupported || remoteHost.xr.phase === "active"} onClick={() => sendCommand({ action: "request-xr", value: "passthrough" })}>Request MR</button>
                  <button className="button danger" type="button" disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || remoteHost?.xr.phase !== "active"} onClick={() => sendCommand({ action: "exit-xr" })}>Exit XR</button>
                </div>
                <div className="field-grid remote-fields">
                  <label>Threat
                    <select value={remoteScene?.config.threatKind ?? "shadow"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete") || remoteHost?.xr.phase === "active"} onChange={(event) => sendCommand({ action: "set-threat", value: event.target.value as ThreatKind })}>
                      <option value="shadow">Shrouded shadow</option><option value="angry-agent">Angry agent</option><option value="spider">Huntsman spider</option>
                    </select>
                  </label>
                  <label>Crowd avatars
                    <select value={remoteScene?.config.agentStyle ?? "minimal"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete") || remoteHost?.xr.phase === "active"} onChange={(event) => sendCommand({ action: "set-agent-style", value: event.target.value as AgentStyle })}>
                      <option value="minimal">Minimal</option><option value="human">Human</option>
                    </select>
                  </label>
                  <label>Intensity
                    <select value={remoteScene?.config.intensity ?? "gentle"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete") || remoteHost?.xr.phase === "active"} onChange={(event) => sendCommand({ action: "set-intensity", value: event.target.value as Intensity })}>
                      <option value="gentle">Gentle</option><option value="standard">Standard</option>
                    </select>
                  </label>
                  <label>Scene background
                    <select value={remoteScene?.config.mode ?? "virtual"} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || remoteHost?.xr.phase === "active"} onChange={(event) => sendCommand({ action: "set-mode", value: event.target.value as SceneMode })}>
                      <option value="virtual">Dusk clearing</option><option value="passthrough">Neutral study grid</option>
                    </select>
                  </label>
                  <label className="check-field"><input type="checkbox" checked={remoteScene?.config.loop ?? false} disabled={receiverState.phase !== "live" || Boolean(pendingCommand) || Boolean(remoteScene?.running && remoteScene.phase !== "complete")} onChange={(event) => sendCommand({ action: "set-loop", value: event.target.checked })} />Loop after completion</label>
                </div>
                {lastCommandReceipt && <p className={`receipt-line ${lastCommandReceipt.status}`}><strong>{lastCommandReceipt.status}</strong> · {lastCommandReceipt.action}{lastCommandReceipt.reason ? ` · ${lastCommandReceipt.reason}` : ""}</p>}
                {pendingCommand?.late && <button className="text-button" type="button" onClick={() => setPendingCommand(undefined)}>Stop tracking late command</button>}
                <p className="microcopy">A command is complete only when the exact request ID returns with a terminal host receipt. VR/MR requests pause for a trusted confirmation on the headset.</p>
              </section>

              <section className="privacy-card">
                <strong>VDO.Ninja data link</strong>
                <p>The public discovery room uses third-party signaling and STUN/TURN. WebRTC peers may learn IP addresses; relay routes can add latency. The app requests no media tracks.</p>
              </section>
            </aside>
          </div>
        </section>
      )}

      <footer><span>Social Threat Lab · schema v4</span><span>Six social dyads · HRTF audio · optional WebXR · VDO.Ninja SDK 1.5.5</span></footer>
    </main>
  );
}
