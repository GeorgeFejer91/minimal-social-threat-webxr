import {
  SCENE_SCHEMA_VERSION,
  type AgentStyle,
  type Intensity,
  type SceneMode,
  type SceneSnapshot,
  type ThreatKind,
} from "./scenario.ts";
import { THREAT_AUDIO_PROTOCOL, isThreatAudioProtocolSnapshot } from "./threat-audio-protocol.ts";

export const SCENE_SYNC_ROOM = "minimal_social_threat_bridge_v2";
export const SCENE_SYNC_STREAM_PREFIX = "mst_bridge_v2_";
export const SCENE_SYNC_CHANNEL = "scene-bridge-v2";
export const SCENE_SYNC_STALE_MS = 1_200;
export const SCENE_SYNC_MAX_HZ = 20;

const MIN_SEND_INTERVAL_MS = 1_000 / SCENE_SYNC_MAX_HZ;
const HEARTBEAT_MS = 250;
const DISCOVERY_SETTLE_MS = 350;
const SDK_OPTIONS = Object.freeze({ password: false, salt: "minimal-social-threat-bridge-v2" });

const MAX_REQUEST_ID_LENGTH = 80;
const MAX_RECEIPTS = 16;
const MAX_RECEIPT_REASON_LENGTH = 160;
const MAX_RECEIPT_MESSAGE_LENGTH = 500;

export type XrRuntimePhase = "inline" | "awaiting-local-confirmation" | "entering" | "active" | "exiting" | "error";
export type ReceiptStatus = "pending" | "confirmed" | "rejected" | "failed";
export type SceneCommandAction =
  | "start"
  | "pause"
  | "resume"
  | "reset"
  | "exit-xr"
  | "set-threat"
  | "set-agent-style"
  | "set-intensity"
  | "set-mode"
  | "set-loop"
  | "request-xr";

export interface CommandReceipt {
  requestId: string;
  action: SceneCommandAction;
  status: ReceiptStatus;
  reason?: string;
  message?: string;
}

export interface HostRuntimeReadback {
  version: 1;
  revision: number;
  pageVisibility: "visible" | "hidden";
  role: "headset" | "participant";
  xr: {
    supportChecked: boolean;
    vrSupported: boolean;
    arSupported: boolean;
    engineReady: boolean;
    phase: XrRuntimePhase;
    activeMode?: SceneMode;
    requestedMode?: SceneMode;
    pendingRequestId?: string;
    frameCount: number;
  };
  receipts: CommandReceipt[];
}

export type SceneCommand =
  | { version: 2; type: "command"; requestId: string; action: "start" | "pause" | "resume" | "reset" | "exit-xr" }
  | { version: 2; type: "command"; requestId: string; action: "set-threat"; value: ThreatKind }
  | { version: 2; type: "command"; requestId: string; action: "set-agent-style"; value: AgentStyle }
  | { version: 2; type: "command"; requestId: string; action: "set-intensity"; value: Intensity }
  | { version: 2; type: "command"; requestId: string; action: "set-mode" | "request-xr"; value: SceneMode }
  | { version: 2; type: "command"; requestId: string; action: "set-loop"; value: boolean };

export type SceneCommandRequest =
  | { action: "start" | "pause" | "resume" | "reset" | "exit-xr" }
  | { action: "set-threat"; value: ThreatKind }
  | { action: "set-agent-style"; value: AgentStyle }
  | { action: "set-intensity"; value: Intensity }
  | { action: "set-mode" | "request-xr"; value: SceneMode }
  | { action: "set-loop"; value: boolean };

export interface SceneWireFrame {
  version: 2;
  type: "scene";
  sequence: number;
  snapshot: SceneSnapshot;
  host: HostRuntimeReadback;
}

interface RemoteChannel extends EventTarget {
  readyState: string;
  bufferedAmount: number;
  binaryType: string;
  send(data: string): void;
  bufferedAmountLowThreshold?: number;
}

interface VdoSdk extends EventTarget {
  connect(): Promise<void>;
  disconnect?(): Promise<void>;
  joinRoom(options: { room: string; password: false }): Promise<void>;
  announce(options: { streamID: string; label: string }): Promise<void>;
  view(streamId: string, options: Record<string, unknown>): Promise<void>;
  stopViewing?(streamId: string): Promise<void>;
  openChannel(uuid: string, label: string, options: Record<string, unknown>): Promise<RemoteChannel>;
  getPeerQuality?(uuid: string): Promise<{ relayed?: boolean; rttMs?: number }>;
}

declare global {
  var VDONinjaSDK: (new (options: Record<string, unknown>) => VdoSdk) | undefined;
}

function detailEvent(type: string, detail: unknown) {
  const event = new Event(type);
  Object.defineProperty(event, "detail", { value: detail, enumerable: true });
  return event;
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown scene-link error");
}

function sdkFactory(): VdoSdk {
  if (typeof globalThis.VDONinjaSDK !== "function") {
    throw new Error("The bundled VDO.Ninja SDK did not load.");
  }
  return new globalThis.VDONinjaSDK(SDK_OPTIONS);
}

function randomHex(bytes = 4) {
  const data = new Uint8Array(bytes);
  globalThis.crypto?.getRandomValues?.(data);
  if (data.every((value) => value === 0)) {
    for (let index = 0; index < data.length; index += 1) data[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function generateSceneSourceId() {
  return `${SCENE_SYNC_STREAM_PREFIX}${randomHex()}`;
}

export function isSceneSource(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(SCENE_SYNC_STREAM_PREFIX);
}

export function formatSceneSourceLabel(streamId: string) {
  const suffix = streamId.replace(SCENE_SYNC_STREAM_PREFIX, "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-8).padStart(8, "0");
  return `Scene ${suffix.slice(0, 4)} ${suffix.slice(4)}`;
}

export function isNewerSequence(sequence: number, previous?: number) {
  if (previous === undefined) return true;
  const distance = ((sequence >>> 0) - (previous >>> 0)) >>> 0;
  return distance > 0 && distance < 0x80000000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function isUint32(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoundedId(value: unknown, maximum = MAX_REQUEST_ID_LENGTH): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && value.trim().length > 0;
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isSceneMode(value: unknown): value is SceneMode {
  return value === "virtual" || value === "passthrough";
}

function isCommandAction(value: unknown): value is SceneCommandAction {
  return value === "start" || value === "pause" || value === "resume" || value === "reset" || value === "exit-xr"
    || value === "set-threat" || value === "set-agent-style" || value === "set-intensity"
    || value === "set-mode" || value === "set-loop" || value === "request-xr";
}

function normalizeAgent(value: unknown): SceneSnapshot["agents"][number] | undefined {
  if (!isRecord(value)) return undefined;
  const agent = value as unknown as SceneSnapshot["agents"][number];
  if (!isBoundedId(agent.id, 40)
    || !isFiniteNumber(agent.x) || !isFiniteNumber(agent.z) || !isFiniteNumber(agent.yaw)
    || !["calm", "alert", "afraid", "angry"].includes(agent.expression)
    || !["idle", "meander", "talk", "listen", "orient", "startle", "flee", "freeze"].includes(agent.behavior)
    || (agent.targetId !== undefined && !isBoundedId(agent.targetId, 40))
    || typeof agent.speaking !== "boolean" || typeof agent.detectedThreat !== "boolean"
    || !isFiniteNumber(agent.fear) || agent.fear < 0 || agent.fear > 1
    || !isFiniteNumber(agent.gait) || !isFiniteNumber(agent.gesture)) return undefined;
  return {
    id: agent.id,
    x: agent.x,
    z: agent.z,
    yaw: agent.yaw,
    expression: agent.expression,
    behavior: agent.behavior,
    ...(agent.targetId === undefined ? {} : { targetId: agent.targetId }),
    speaking: agent.speaking,
    detectedThreat: agent.detectedThreat,
    fear: agent.fear,
    gait: agent.gait,
    gesture: agent.gesture,
  };
}

function normalizeSnapshot(value: unknown): SceneSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  const item = value as unknown as SceneSnapshot;
  if (item.schemaVersion !== SCENE_SCHEMA_VERSION
    || !isBoundedId(item.sessionId)
    || !isFiniteNumber(item.elapsedMs) || item.elapsedMs < 0
    || !["ready", "baseline", "detected", "approach", "hold", "complete"].includes(item.phase)
    || typeof item.running !== "boolean" || typeof item.paused !== "boolean"
    || !isRecord(item.config)
    || !["shadow", "angry-agent", "spider"].includes(item.config.threatKind)
    || !["minimal", "human"].includes(item.config.agentStyle)
    || !["gentle", "standard"].includes(item.config.intensity)
    || !isSceneMode(item.config.mode) || typeof item.config.loop !== "boolean"
    || !isRecord(item.viewer) || item.viewer.x !== 0 || item.viewer.z !== 0 || item.viewer.yaw !== 0
    || !Array.isArray(item.agents) || item.agents.length !== 12
    || !Array.isArray(item.socialLinks) || item.socialLinks.length > 12
    || !Array.isArray(item.audioCues) || item.audioCues.length > 4
    || !isThreatAudioProtocolSnapshot(item.audioProtocol)
    || !isRecord(item.threat)
    || !isFiniteNumber(item.minimumThreatDistance) || item.minimumThreatDistance <= 0
    || (item.lastCommandId !== undefined && !isBoundedId(item.lastCommandId))) return undefined;

  const agents: SceneSnapshot["agents"] = [];
  for (const candidate of item.agents) {
    const agent = normalizeAgent(candidate);
    if (!agent) return undefined;
    agents.push(agent);
  }

  const socialLinks: SceneSnapshot["socialLinks"] = [];
  for (const candidate of item.socialLinks) {
    if (!isRecord(candidate)) return undefined;
    const link = candidate as unknown as SceneSnapshot["socialLinks"][number];
    if (!isBoundedId(link.sourceId, 40) || !isBoundedId(link.targetId, 40)
      || (link.kind !== "conversation" && link.kind !== "alarm")) return undefined;
    socialLinks.push({ sourceId: link.sourceId, targetId: link.targetId, kind: link.kind });
  }

  const audioCues: SceneSnapshot["audioCues"] = [];
  for (const candidate of item.audioCues) {
    if (!isRecord(candidate)) return undefined;
    const cue = candidate as unknown as SceneSnapshot["audioCues"][number];
    if (!isBoundedId(cue.id, 128) || !isBoundedId(cue.sourceId, 40)
      || !isBoundedString(cue.text, 80)
      || !["friendly", "murmur", "acknowledge", "warning", "gasp", "pps-looming-bursts", "roughness", "spider-menace"].includes(cue.kind)
      || !isFiniteNumber(cue.x) || !isFiniteNumber(cue.y) || cue.y < 0 || cue.y > 3
      || !isFiniteNumber(cue.z) || !isFiniteNumber(cue.gain)
      || !isFiniteNumber(cue.startedAtMs) || !isFiniteNumber(cue.durationMs) || cue.durationMs < 0) return undefined;
    audioCues.push({
      id: cue.id,
      sourceId: cue.sourceId,
      kind: cue.kind,
      text: cue.text,
      x: cue.x,
      y: cue.y,
      z: cue.z,
      gain: cue.gain,
      startedAtMs: cue.startedAtMs,
      durationMs: cue.durationMs,
    });
  }

  const threat = item.threat;
  if (!["shadow", "angry-agent", "spider"].includes(threat.kind)
    || !isFiniteNumber(threat.x) || !isFiniteNumber(threat.z) || !isFiniteNumber(threat.yaw)
    || threat.expression !== "angry" || !isFiniteNumber(threat.distance) || threat.distance < item.minimumThreatDistance
    || !isFiniteNumber(threat.visibility) || threat.visibility < 0 || threat.visibility > 1) return undefined;

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    sessionId: item.sessionId,
    elapsedMs: item.elapsedMs,
    phase: item.phase,
    running: item.running,
    paused: item.paused,
    config: {
      threatKind: item.config.threatKind,
      agentStyle: item.config.agentStyle,
      intensity: item.config.intensity,
      mode: item.config.mode,
      loop: item.config.loop,
    },
    viewer: { x: 0, z: 0, yaw: 0 },
    agents,
    socialLinks,
    audioCues,
    audioProtocol: THREAT_AUDIO_PROTOCOL,
    threat: {
      kind: threat.kind,
      x: threat.x,
      z: threat.z,
      yaw: threat.yaw,
      expression: "angry",
      distance: threat.distance,
      visibility: threat.visibility,
    },
    minimumThreatDistance: item.minimumThreatDistance,
    ...(item.lastCommandId === undefined ? {} : { lastCommandId: item.lastCommandId }),
  };
}

function normalizeReceipt(value: unknown): CommandReceipt | undefined {
  if (!isRecord(value) || !hasExactKeys(value, ["requestId", "action", "status"], ["reason", "message"])) return undefined;
  if (!isBoundedId(value.requestId) || !isCommandAction(value.action)
    || !["pending", "confirmed", "rejected", "failed"].includes(String(value.status))
    || (value.reason !== undefined && !isBoundedString(value.reason, MAX_RECEIPT_REASON_LENGTH))
    || (value.message !== undefined && !isBoundedString(value.message, MAX_RECEIPT_MESSAGE_LENGTH))) return undefined;
  return {
    requestId: value.requestId,
    action: value.action,
    status: value.status as ReceiptStatus,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
    ...(value.message === undefined ? {} : { message: value.message }),
  };
}

function normalizeHost(value: unknown): HostRuntimeReadback | undefined {
  if (!isRecord(value) || !hasExactKeys(value, ["version", "revision", "pageVisibility", "role", "xr", "receipts"])
    || value.version !== 1 || !isUint32(value.revision)
    || (value.pageVisibility !== "visible" && value.pageVisibility !== "hidden")
    || (value.role !== "headset" && value.role !== "participant")
    || !isRecord(value.xr) || !hasExactKeys(value.xr,
      ["supportChecked", "vrSupported", "arSupported", "engineReady", "phase", "frameCount"],
      ["activeMode", "requestedMode", "pendingRequestId"])
    || typeof value.xr.supportChecked !== "boolean" || typeof value.xr.vrSupported !== "boolean"
    || typeof value.xr.arSupported !== "boolean" || typeof value.xr.engineReady !== "boolean"
    || !["inline", "awaiting-local-confirmation", "entering", "active", "exiting", "error"].includes(String(value.xr.phase))
    || (value.xr.activeMode !== undefined && !isSceneMode(value.xr.activeMode))
    || (value.xr.requestedMode !== undefined && !isSceneMode(value.xr.requestedMode))
    || (value.xr.pendingRequestId !== undefined && !isBoundedId(value.xr.pendingRequestId))
    || !isUint32(value.xr.frameCount)
    || !Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS) return undefined;

  const receipts: CommandReceipt[] = [];
  for (const candidate of value.receipts) {
    const receipt = normalizeReceipt(candidate);
    if (!receipt) return undefined;
    receipts.push(receipt);
  }
  return {
    version: 1,
    revision: value.revision,
    pageVisibility: value.pageVisibility,
    role: value.role,
    xr: {
      supportChecked: value.xr.supportChecked,
      vrSupported: value.xr.vrSupported,
      arSupported: value.xr.arSupported,
      engineReady: value.xr.engineReady,
      phase: value.xr.phase as XrRuntimePhase,
      ...(value.xr.activeMode === undefined ? {} : { activeMode: value.xr.activeMode }),
      ...(value.xr.requestedMode === undefined ? {} : { requestedMode: value.xr.requestedMode }),
      ...(value.xr.pendingRequestId === undefined ? {} : { pendingRequestId: value.xr.pendingRequestId }),
      frameCount: value.xr.frameCount,
    },
    receipts,
  };
}

export function encodeSceneFrame(sequence: number, snapshot: SceneSnapshot, host: HostRuntimeReadback) {
  return JSON.stringify({ version: 2, type: "scene", sequence: sequence >>> 0, snapshot, host } satisfies SceneWireFrame);
}

export function decodeSceneFrame(value: unknown): SceneWireFrame | undefined {
  if (typeof value !== "string" || value.length > 32_000) return undefined;
  try {
    const frame = JSON.parse(value) as unknown;
    if (!isRecord(frame) || !hasExactKeys(frame, ["version", "type", "sequence", "snapshot", "host"])
      || frame.version !== 2 || frame.type !== "scene" || !isUint32(frame.sequence)) return undefined;
    const snapshot = normalizeSnapshot(frame.snapshot);
    const host = normalizeHost(frame.host);
    if (!snapshot || !host) return undefined;
    return { version: 2, type: "scene", sequence: frame.sequence, snapshot, host };
  } catch {
    return undefined;
  }
}

export function decodeSceneCommand(value: unknown): SceneCommand | undefined {
  if (typeof value !== "string" || value.length > 1_000) return undefined;
  try {
    const command = JSON.parse(value) as unknown;
    if (!isRecord(command) || command.version !== 2 || command.type !== "command"
      || !isBoundedId(command.requestId) || !isCommandAction(command.action)) return undefined;

    const base = { version: 2 as const, type: "command" as const, requestId: command.requestId };
    if (command.action === "start" || command.action === "pause" || command.action === "resume"
      || command.action === "reset" || command.action === "exit-xr") {
      if (!hasExactKeys(command, ["version", "type", "requestId", "action"])) return undefined;
      return { ...base, action: command.action };
    }
    if (!hasExactKeys(command, ["version", "type", "requestId", "action", "value"])) return undefined;
    if (command.action === "set-threat" && ["shadow", "angry-agent", "spider"].includes(String(command.value))) {
      return { ...base, action: command.action, value: command.value as ThreatKind };
    }
    if (command.action === "set-agent-style" && (command.value === "minimal" || command.value === "human")) {
      return { ...base, action: command.action, value: command.value };
    }
    if (command.action === "set-intensity" && (command.value === "gentle" || command.value === "standard")) {
      return { ...base, action: command.action, value: command.value };
    }
    if ((command.action === "set-mode" || command.action === "request-xr") && isSceneMode(command.value)) {
      return { ...base, action: command.action, value: command.value };
    }
    if (command.action === "set-loop" && typeof command.value === "boolean") {
      return { ...base, action: command.action, value: command.value };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function sourceItem(value: unknown) {
  if (typeof value === "string") return { streamId: value, uuid: "" };
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    streamId: String(item.streamID ?? item.streamId ?? ""),
    uuid: String(item.UUID ?? item.uuid ?? ""),
  };
}

function qualitySummary(quality?: { relayed?: boolean; rttMs?: number }) {
  return {
    route: quality?.relayed === true ? "relay" : quality?.relayed === false ? "direct" : "unknown",
    rttMs: Number.isFinite(quality?.rttMs) ? Math.round(quality!.rttMs!) : undefined,
  };
}

class SceneLinkBase extends EventTarget {
  sdk?: VdoSdk;
  listeners: Array<[string, EventListener]> = [];
  intervals = new Set<ReturnType<typeof setInterval>>();
  timeouts = new Set<ReturnType<typeof setTimeout>>();

  listen(type: string, handler: EventListener) {
    this.sdk!.addEventListener(type, handler);
    this.listeners.push([type, handler]);
  }

  interval(callback: () => void, milliseconds: number) {
    const id = globalThis.setInterval(callback, milliseconds);
    this.intervals.add(id);
    return id;
  }

  timeout(callback: () => void, milliseconds: number) {
    const id = globalThis.setTimeout(() => {
      this.timeouts.delete(id);
      callback();
    }, milliseconds);
    this.timeouts.add(id);
    return id;
  }

  clearTimers() {
    for (const id of this.intervals) clearInterval(id);
    for (const id of this.timeouts) clearTimeout(id);
    this.intervals.clear();
    this.timeouts.clear();
  }

  clearTimeout(id?: ReturnType<typeof setTimeout>) {
    if (id === undefined) return;
    globalThis.clearTimeout(id);
    this.timeouts.delete(id);
  }

  async disconnectSdk() {
    this.clearTimers();
    if (this.sdk) {
      for (const [type, handler] of this.listeners) this.sdk.removeEventListener(type, handler);
      try { await this.sdk.disconnect?.(); } catch { /* best-effort teardown */ }
    }
    this.listeners = [];
    this.sdk = undefined;
  }
}

export class SceneBroadcaster extends SceneLinkBase {
  phase: "idle" | "connecting" | "broadcasting" | "error" = "idle";
  streamId = "";
  channels = new Map<string, RemoteChannel>();
  openingPeers = new Set<string>();
  quality = new Map<string, ReturnType<typeof qualitySummary>>();
  latest?: SceneSnapshot;
  latestHost?: HostRuntimeReadback;
  lastSerialized = "";
  lastSentAt = -Infinity;
  sequence = 0;
  droppedBackpressure = 0;
  heartbeatTimer?: ReturnType<typeof setTimeout>;
  seenCommandIds = new Set<string>();

  snapshot() {
    const qualities = [...this.quality.values()];
    return {
      phase: this.phase,
      streamId: this.streamId,
      sourceLabel: this.streamId ? formatSceneSourceLabel(this.streamId) : "",
      listenerCount: this.channels.size,
      route: qualities.some((item) => item.route === "relay") ? "relay" : qualities.some((item) => item.route === "direct") ? "direct" : "unknown",
      rttMs: Math.max(0, ...qualities.map((item) => item.rttMs ?? 0)) || undefined,
      droppedBackpressure: this.droppedBackpressure,
    };
  }

  emit(extra: Record<string, unknown> = {}) {
    this.dispatchEvent(detailEvent("statechange", { ...this.snapshot(), ...extra }));
  }

  async start() {
    if (this.phase !== "idle" && this.phase !== "error") return this.snapshot();
    await this.stop();
    this.phase = "connecting";
    this.streamId = generateSceneSourceId();
    this.emit();
    try {
      this.sdk = sdkFactory();
      this.listen("dataChannelOpen", ((event: Event & { detail?: { uuid?: string } }) => { void this.openChannel(event.detail?.uuid); }) as EventListener);
      this.listen("dataChannelClose", ((event: Event & { detail?: { uuid?: string } }) => this.removePeer(event.detail?.uuid)) as EventListener);
      this.listen("userLeft", ((event: Event & { detail?: { UUID?: string; uuid?: string } }) => this.removePeer(event.detail?.UUID ?? event.detail?.uuid)) as EventListener);
      this.listen("error", ((event: Event & { detail?: unknown }) => this.emit({ error: true, message: normalizeError(event.detail) })) as EventListener);
      await this.sdk.connect();
      await this.sdk.joinRoom({ room: SCENE_SYNC_ROOM, password: false });
      await this.sdk.announce({ streamID: this.streamId, label: formatSceneSourceLabel(this.streamId) });
      this.phase = "broadcasting";
      this.interval(() => { void this.refreshQuality(); }, 2_000);
      this.scheduleHeartbeat();
      this.emit({ message: "Scene link is available to companion browsers." });
      return this.snapshot();
    } catch (error) {
      this.phase = "error";
      this.emit({ error: true, message: normalizeError(error) });
      await this.disconnectSdk();
      throw error;
    }
  }

  offer(snapshot: SceneSnapshot, host: HostRuntimeReadback, offeredAt = performance.now()) {
    this.latest = snapshot;
    this.latestHost = host;
    const serialized = JSON.stringify({ snapshot, host });
    if (serialized !== this.lastSerialized && offeredAt - this.lastSentAt >= MIN_SEND_INTERVAL_MS) return this.flush(false, offeredAt);
    return false;
  }

  flush(force = false, sentAt = performance.now(), onlyUuid?: string) {
    if (this.phase !== "broadcasting" || !this.latest || !this.latestHost || this.channels.size === 0) return false;
    const serialized = JSON.stringify({ snapshot: this.latest, host: this.latestHost });
    if (!force && (serialized === this.lastSerialized || sentAt - this.lastSentAt < MIN_SEND_INTERVAL_MS)) return false;
    const nextSequence = (this.sequence + 1) >>> 0;
    const wire = encodeSceneFrame(nextSequence, this.latest, this.latestHost);
    let sent = false;
    const targets: Iterable<[string, RemoteChannel | undefined]> = onlyUuid ? [[onlyUuid, this.channels.get(onlyUuid)]] : this.channels.entries();
    for (const [, channel] of targets) {
      if (!channel || channel.readyState !== "open") continue;
      if (channel.bufferedAmount > 0) {
        this.droppedBackpressure += 1;
        continue;
      }
      try { channel.send(wire); sent = true; } catch { /* close events own removal */ }
    }
    if (sent) {
      this.sequence = nextSequence;
      this.lastSerialized = serialized;
      this.lastSentAt = sentAt;
      this.scheduleHeartbeat();
    }
    return sent;
  }

  scheduleHeartbeat() {
    this.clearTimeout(this.heartbeatTimer);
    if (this.phase !== "broadcasting") return;
    this.heartbeatTimer = this.timeout(() => {
      this.heartbeatTimer = undefined;
      this.flush(true);
      this.scheduleHeartbeat();
    }, HEARTBEAT_MS);
  }

  async openChannel(uuid?: string) {
    if (!uuid || !this.sdk || this.channels.has(uuid) || this.openingPeers.has(uuid)) return;
    this.openingPeers.add(uuid);
    try {
      const channel = await this.sdk.openChannel(uuid, SCENE_SYNC_CHANNEL, { ordered: false, maxRetransmits: 0 });
      channel.binaryType = "arraybuffer";
      channel.bufferedAmountLowThreshold = 0;
      channel.addEventListener("message", ((event: Event & { data?: unknown }) => {
        const command = decodeSceneCommand(event.data);
        if (!command || this.seenCommandIds.has(command.requestId)) return;
        this.seenCommandIds.add(command.requestId);
        if (this.seenCommandIds.size > 100) this.seenCommandIds.delete(this.seenCommandIds.values().next().value!);
        this.dispatchEvent(detailEvent("command", command));
      }) as EventListener);
      channel.addEventListener("close", (() => this.removePeer(uuid)) as EventListener, { once: true });
      this.channels.set(uuid, channel);
      this.flush(true, performance.now(), uuid);
      this.emit({ message: "A companion browser is receiving the scene." });
      void this.refreshQuality();
    } catch (error) {
      this.emit({ error: true, message: normalizeError(error) });
    } finally {
      this.openingPeers.delete(uuid);
    }
  }

  removePeer(uuid?: string) {
    if (!uuid) return;
    const changed = this.channels.delete(uuid) || this.quality.delete(uuid);
    this.openingPeers.delete(uuid);
    if (changed) this.emit();
  }

  async refreshQuality() {
    if (!this.sdk?.getPeerQuality) return;
    await Promise.all([...this.channels.keys()].map(async (uuid) => {
      try { this.quality.set(uuid, qualitySummary(await this.sdk!.getPeerQuality!(uuid))); } catch { this.quality.delete(uuid); }
    }));
    this.emit();
  }

  async stop() {
    await this.disconnectSdk();
    this.phase = "idle";
    this.streamId = "";
    this.channels.clear();
    this.openingPeers.clear();
    this.quality.clear();
    this.latest = undefined;
    this.latestHost = undefined;
    this.lastSerialized = "";
    this.lastSentAt = -Infinity;
    this.sequence = 0;
    this.droppedBackpressure = 0;
    this.heartbeatTimer = undefined;
    this.seenCommandIds.clear();
    this.emit();
  }
}

export class SceneReceiver extends SceneLinkBase {
  phase: "idle" | "discovering" | "selecting" | "connecting" | "live" | "stale" | "error" = "idle";
  sources = new Map<string, { streamId: string; uuid: string; label: string }>();
  selectedStreamId = "";
  selectedUuid = "";
  channel?: RemoteChannel;
  latest?: SceneWireFrame & { receivedAt: number };
  lastSequence?: number;
  quality = qualitySummary();
  discoveryTimer?: ReturnType<typeof setTimeout>;
  staleTimer?: ReturnType<typeof setTimeout>;

  snapshot(now = performance.now()) {
    const packetAgeMs = this.latest ? Math.max(0, now - this.latest.receivedAt) : undefined;
    const stale = Boolean(this.selectedStreamId && this.latest && packetAgeMs! >= SCENE_SYNC_STALE_MS);
    return {
      phase: stale ? "stale" : this.phase,
      sources: [...this.sources.values()].sort((a, b) => a.label.localeCompare(b.label)),
      selectedStreamId: this.selectedStreamId,
      sourceLabel: this.selectedStreamId ? formatSceneSourceLabel(this.selectedStreamId) : "",
      latest: this.latest,
      packetAgeMs,
      route: this.quality.route,
      rttMs: this.quality.rttMs,
    };
  }

  emit(extra: Record<string, unknown> = {}) {
    this.dispatchEvent(detailEvent("statechange", { ...this.snapshot(), ...extra }));
  }

  addSource(value: unknown) {
    const { streamId, uuid } = sourceItem(value);
    if (!isSceneSource(streamId)) return;
    this.sources.set(streamId, { streamId, uuid, label: formatSceneSourceLabel(streamId) });
    if (!this.selectedStreamId) this.scheduleAutoSelection();
    this.emit();
  }

  addListing(detail: unknown) {
    const list = (detail as { list?: unknown[] })?.list;
    if (Array.isArray(list)) list.forEach((item) => this.addSource(item));
    else this.addSource(detail);
  }

  removeSource(identifier?: string) {
    if (!identifier) return;
    const selectedLeft = this.selectedUuid === identifier || this.selectedStreamId === identifier;
    for (const [streamId, source] of this.sources) {
      if (identifier === streamId || identifier === source.uuid) this.sources.delete(streamId);
    }
    if (selectedLeft) {
      this.selectedStreamId = "";
      this.selectedUuid = "";
      this.channel = undefined;
      this.latest = undefined;
      this.lastSequence = undefined;
      this.quality = qualitySummary();
      this.phase = "discovering";
      this.emit({ message: "The selected scene left; looking for its replacement…" });
      this.scheduleAutoSelection();
      return;
    }
    this.emit();
  }

  handleSelectedChannelClose(streamId: string, channel: RemoteChannel) {
    if (this.channel !== channel || this.selectedStreamId !== streamId) return;
    this.sources.delete(streamId);
    this.selectedStreamId = "";
    this.selectedUuid = "";
    this.channel = undefined;
    this.latest = undefined;
    this.lastSequence = undefined;
    this.quality = qualitySummary();
    this.phase = "discovering";
    this.emit({ message: "The realtime scene channel closed; looking for a replacement…" });
    this.scheduleAutoSelection();
  }

  scheduleAutoSelection() {
    if (this.discoveryTimer || this.selectedStreamId) return;
    this.discoveryTimer = this.timeout(() => {
      this.discoveryTimer = undefined;
      if (this.selectedStreamId) return;
      if (this.sources.size === 1) void this.selectSource([...this.sources.keys()][0]);
      else { this.phase = this.sources.size > 1 ? "selecting" : "discovering"; this.emit(); }
    }, DISCOVERY_SETTLE_MS);
  }

  async startDiscovery() {
    if (this.phase !== "idle" && this.phase !== "error") return this.snapshot();
    await this.stop();
    this.phase = "discovering";
    this.emit({ message: "Looking for public scene broadcasts…" });
    try {
      this.sdk = sdkFactory();
      this.listen("listing", ((event: Event & { detail?: unknown }) => this.addListing(event.detail)) as EventListener);
      this.listen("videoaddedtoroom", ((event: Event & { detail?: unknown }) => this.addSource(event.detail)) as EventListener);
      this.listen("userLeft", ((event: Event & { detail?: Record<string, string> }) => this.removeSource(event.detail?.UUID ?? event.detail?.uuid ?? event.detail?.streamID)) as EventListener);
      this.listen("channelOpen", ((event: Event & { detail?: unknown }) => this.acceptChannel(event.detail)) as EventListener);
      this.listen("error", ((event: Event & { detail?: unknown }) => this.emit({ error: true, message: normalizeError(event.detail) })) as EventListener);
      await this.sdk.connect();
      await this.sdk.joinRoom({ room: SCENE_SYNC_ROOM, password: false });
      this.interval(() => { void this.refreshQuality(); }, 2_000);
      this.scheduleAutoSelection();
      this.emit();
      return this.snapshot();
    } catch (error) {
      this.phase = "error";
      this.emit({ error: true, message: normalizeError(error) });
      await this.disconnectSdk();
      throw error;
    }
  }

  async selectSource(streamId: string) {
    if (!this.sdk || !isSceneSource(streamId)) return this.snapshot();
    if (this.selectedStreamId) {
      try { await this.sdk.stopViewing?.(this.selectedStreamId); } catch { /* peer may have left */ }
    }
    const source = this.sources.get(streamId);
    this.selectedStreamId = streamId;
    this.selectedUuid = source?.uuid ?? "";
    this.channel = undefined;
    this.latest = undefined;
    this.lastSequence = undefined;
    this.quality = qualitySummary();
    this.phase = "connecting";
    this.emit({ message: `Connecting to ${formatSceneSourceLabel(streamId)}…` });
    try {
      await this.sdk.view(streamId, { audio: false, video: false, downloads: false, allowresources: false, label: "Social threat companion" });
    } catch (error) {
      this.phase = "error";
      this.emit({ error: true, message: normalizeError(error) });
    }
    return this.snapshot();
  }

  acceptChannel(value: unknown) {
    const detail = value as { label?: string; streamID?: string; uuid?: string; channel?: RemoteChannel };
    if (detail?.label !== `x-${SCENE_SYNC_CHANNEL}` || !detail.channel || !this.selectedStreamId) return;
    if (detail.streamID && detail.streamID !== this.selectedStreamId) return;
    if (this.selectedUuid && detail.uuid && detail.uuid !== this.selectedUuid) return;
    const acceptedStream = this.selectedStreamId;
    const acceptedChannel = detail.channel;
    this.selectedUuid = detail.uuid ?? this.selectedUuid;
    this.channel = acceptedChannel;
    acceptedChannel.addEventListener("message", ((event: Event & { data?: unknown }) => {
      if (this.channel === acceptedChannel && this.selectedStreamId === acceptedStream) this.acceptFrame(event.data);
    }) as EventListener);
    acceptedChannel.addEventListener("close", (() => {
      this.handleSelectedChannelClose(acceptedStream, acceptedChannel);
    }) as EventListener, { once: true });
    this.emit({ message: "Realtime channel open; waiting for a scene frame…" });
    void this.refreshQuality();
  }

  acceptFrame(value: unknown, receivedAt = performance.now()) {
    const frame = decodeSceneFrame(value);
    if (!frame || !isNewerSequence(frame.sequence, this.lastSequence)) return false;
    const recovered = this.phase === "stale";
    this.lastSequence = frame.sequence;
    this.latest = { ...frame, receivedAt };
    this.phase = "live";
    this.clearTimeout(this.staleTimer);
    this.staleTimer = this.timeout(() => this.markStale("No scene frame arrived for 1.2 seconds; holding the last state."), SCENE_SYNC_STALE_MS);
    this.dispatchEvent(detailEvent("frame", this.snapshot(receivedAt)));
    if (recovered) this.emit({ message: "Scene stream recovered." });
    return true;
  }

  send(command: SceneCommandRequest) {
    if (!this.channel || this.channel.readyState !== "open") return "";
    const channel = this.channel;
    const streamId = this.selectedStreamId;
    const requestId = `cmd_${randomHex(6)}`;
    const wire = { version: 2, type: "command", requestId, ...command } as SceneCommand;
    const serialized = JSON.stringify(wire);
    const retry = () => {
      if (this.channel === channel && this.selectedStreamId === streamId && channel.readyState === "open") channel.send(serialized);
    };
    channel.send(serialized);
    this.timeout(retry, 120);
    this.timeout(retry, 320);
    return requestId;
  }

  markStale(message: string) {
    if (!this.selectedStreamId || this.phase === "idle") return;
    this.phase = "stale";
    this.emit({ message });
  }

  async refreshQuality() {
    if (!this.sdk?.getPeerQuality || !this.selectedUuid) return;
    try { this.quality = qualitySummary(await this.sdk.getPeerQuality(this.selectedUuid)); } catch { this.quality = qualitySummary(); }
    this.emit();
  }

  async stop() {
    if (this.sdk && this.selectedStreamId) {
      try { await this.sdk.stopViewing?.(this.selectedStreamId); } catch { /* continue teardown */ }
    }
    await this.disconnectSdk();
    this.phase = "idle";
    this.sources.clear();
    this.selectedStreamId = "";
    this.selectedUuid = "";
    this.channel = undefined;
    this.latest = undefined;
    this.lastSequence = undefined;
    this.quality = qualitySummary();
    this.discoveryTimer = undefined;
    this.staleTimer = undefined;
    this.emit();
  }
}
