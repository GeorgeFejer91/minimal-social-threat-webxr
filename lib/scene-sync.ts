import { SCENE_SCHEMA_VERSION, type Intensity, type SceneSnapshot, type ThreatKind } from "./scenario.ts";

export const SCENE_SYNC_ROOM = "minimal_social_threat_v1";
export const SCENE_SYNC_STREAM_PREFIX = "mst_scene_";
export const SCENE_SYNC_CHANNEL = "scenev1";
export const SCENE_SYNC_STALE_MS = 1_200;
export const SCENE_SYNC_MAX_HZ = 20;

const MIN_SEND_INTERVAL_MS = 1_000 / SCENE_SYNC_MAX_HZ;
const HEARTBEAT_MS = 250;
const DISCOVERY_SETTLE_MS = 350;
const SDK_OPTIONS = Object.freeze({ password: false, salt: "minimal-social-threat-v1" });

export type SceneCommand =
  | { version: 1; type: "command"; requestId: string; action: "start" | "pause" | "resume" | "reset" }
  | { version: 1; type: "command"; requestId: string; action: "set-threat"; value: ThreatKind }
  | { version: 1; type: "command"; requestId: string; action: "set-intensity"; value: Intensity };

export type SceneCommandRequest =
  | { action: "start" | "pause" | "resume" | "reset" }
  | { action: "set-threat"; value: ThreatKind }
  | { action: "set-intensity"; value: Intensity };

interface SceneWireFrame {
  version: 1;
  type: "scene";
  sequence: number;
  snapshot: SceneSnapshot;
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

function validSnapshot(value: unknown): value is SceneSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SceneSnapshot>;
  return item.schemaVersion === SCENE_SCHEMA_VERSION
    && typeof item.sessionId === "string" && item.sessionId.length > 0 && item.sessionId.length <= 80
    && Number.isFinite(item.elapsedMs) && item.elapsedMs! >= 0
    && ["ready", "baseline", "detected", "approach", "hold", "complete"].includes(String(item.phase))
    && Boolean(item.config
      && ["tiger", "angry-agent"].includes(item.config.threatKind)
      && ["gentle", "standard"].includes(item.config.intensity)
      && ["virtual", "passthrough"].includes(item.config.mode))
    && Array.isArray(item.agents) && item.agents.length === 6
    && item.agents.every((agent) => typeof agent.id === "string" && agent.id.length <= 40
      && Number.isFinite(agent.x) && Number.isFinite(agent.z) && Number.isFinite(agent.yaw)
      && ["calm", "alert", "afraid", "angry"].includes(agent.expression))
    && Boolean(item.threat
      && ["tiger", "angry-agent"].includes(item.threat.kind)
      && Number.isFinite(item.threat.x) && Number.isFinite(item.threat.z)
      && Number.isFinite(item.threat.distance));
}

export function encodeSceneFrame(sequence: number, snapshot: SceneSnapshot) {
  return JSON.stringify({ version: 1, type: "scene", sequence: sequence >>> 0, snapshot } satisfies SceneWireFrame);
}

export function decodeSceneFrame(value: unknown): SceneWireFrame | undefined {
  if (typeof value !== "string" || value.length > 32_000) return undefined;
  try {
    const frame = JSON.parse(value) as Partial<SceneWireFrame>;
    if (frame.version !== 1 || frame.type !== "scene" || !Number.isInteger(frame.sequence)
      || frame.sequence! < 0 || frame.sequence! > 0xffffffff || !validSnapshot(frame.snapshot)) return undefined;
    return frame as SceneWireFrame;
  } catch {
    return undefined;
  }
}

export function decodeSceneCommand(value: unknown): SceneCommand | undefined {
  if (typeof value !== "string" || value.length > 1_000) return undefined;
  try {
    const command = JSON.parse(value) as Partial<SceneCommand> & { value?: unknown };
    if (command.version !== 1 || command.type !== "command" || typeof command.requestId !== "string" || command.requestId.length > 80) return undefined;
    if (["start", "pause", "resume", "reset"].includes(String(command.action))) return command as SceneCommand;
    if (command.action === "set-threat" && ["tiger", "angry-agent"].includes(String(command.value))) return command as SceneCommand;
    if (command.action === "set-intensity" && ["gentle", "standard"].includes(String(command.value))) return command as SceneCommand;
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

  offer(snapshot: SceneSnapshot, offeredAt = performance.now()) {
    this.latest = snapshot;
    const serialized = JSON.stringify(snapshot);
    if (serialized !== this.lastSerialized && offeredAt - this.lastSentAt >= MIN_SEND_INTERVAL_MS) return this.flush(false, offeredAt);
    return false;
  }

  flush(force = false, sentAt = performance.now(), onlyUuid?: string) {
    if (this.phase !== "broadcasting" || !this.latest || this.channels.size === 0) return false;
    const serialized = JSON.stringify(this.latest);
    if (!force && (serialized === this.lastSerialized || sentAt - this.lastSentAt < MIN_SEND_INTERVAL_MS)) return false;
    const nextSequence = (this.sequence + 1) >>> 0;
    const wire = encodeSceneFrame(nextSequence, this.latest);
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
    for (const [streamId, source] of this.sources) {
      if (identifier === streamId || identifier === source.uuid) this.sources.delete(streamId);
    }
    if (this.selectedUuid === identifier || this.selectedStreamId === identifier) this.markStale("The selected scene left the room.");
    this.emit();
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
      if (this.channel === acceptedChannel) this.markStale("The realtime scene channel closed.");
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
    const requestId = `cmd_${randomHex(6)}`;
    const wire = { version: 1, type: "command", requestId, ...command } as SceneCommand;
    this.channel.send(JSON.stringify(wire));
    this.timeout(() => { if (this.channel?.readyState === "open") this.channel.send(JSON.stringify(wire)); }, 120);
    this.timeout(() => { if (this.channel?.readyState === "open") this.channel.send(JSON.stringify(wire)); }, 320);
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
