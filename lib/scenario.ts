export const SCENE_SCHEMA_VERSION = 4 as const;

export type ThreatKind = "shadow" | "angry-agent" | "spider";
export type AgentStyle = "minimal" | "human";
export type Intensity = "gentle" | "standard";
export type SceneMode = "virtual" | "passthrough";
export type Expression = "calm" | "alert" | "afraid" | "angry";
export type AgentBehavior = "idle" | "meander" | "talk" | "listen" | "orient" | "startle" | "flee" | "freeze";
export type ScenarioPhase = "ready" | "baseline" | "detected" | "approach" | "hold" | "complete";
export type AudioCueKind = "friendly" | "murmur" | "acknowledge" | "warning" | "gasp" | "roughness" | "spider-menace";

export interface ScenarioConfig {
  threatKind: ThreatKind;
  agentStyle: AgentStyle;
  intensity: Intensity;
  mode: SceneMode;
  loop: boolean;
}

export interface AgentState {
  id: string;
  x: number;
  z: number;
  yaw: number;
  expression: Expression;
  behavior: AgentBehavior;
  targetId?: string;
  speaking: boolean;
  detectedThreat: boolean;
  fear: number;
  gait: number;
  gesture: number;
}

export interface ThreatState {
  kind: ThreatKind;
  x: number;
  z: number;
  yaw: number;
  expression: "angry";
  distance: number;
  visibility: number;
}

export interface AudioCue {
  id: string;
  sourceId: string;
  kind: AudioCueKind;
  text: string;
  x: number;
  z: number;
  gain: number;
  startedAtMs: number;
  durationMs: number;
}

export interface SocialLink {
  sourceId: string;
  targetId: string;
  kind: "conversation" | "alarm";
}

export interface SceneSnapshot {
  schemaVersion: typeof SCENE_SCHEMA_VERSION;
  sessionId: string;
  elapsedMs: number;
  phase: ScenarioPhase;
  running: boolean;
  paused: boolean;
  config: ScenarioConfig;
  viewer: { x: 0; z: 0; yaw: 0 };
  agents: AgentState[];
  socialLinks: SocialLink[];
  audioCues: AudioCue[];
  threat: ThreatState;
  minimumThreatDistance: number;
  lastCommandId?: string;
}

interface AgentDefinition {
  id: string;
  x: number;
  z: number;
  partnerId: string;
  pair: number;
  seed: number;
  detectionDelay: number;
}

const BASE_AGENTS: readonly AgentDefinition[] = [
  { id: "agent-a", x: -3.80, z: -2.50, partnerId: "agent-b", pair: 0, seed: 0.35, detectionDelay: 0.05 },
  { id: "agent-b", x: -2.60, z: -2.80, partnerId: "agent-a", pair: 0, seed: 1.70, detectionDelay: 1.30 },
  { id: "agent-c", x: 2.55, z: -2.75, partnerId: "agent-d", pair: 1, seed: 2.85, detectionDelay: 0.42 },
  { id: "agent-d", x: 3.80, z: -2.45, partnerId: "agent-c", pair: 1, seed: 4.10, detectionDelay: 1.62 },
  { id: "agent-e", x: -2.30, z: -4.00, partnerId: "agent-f", pair: 2, seed: 5.20, detectionDelay: 0.80 },
  { id: "agent-f", x: -0.90, z: -4.25, partnerId: "agent-e", pair: 2, seed: 6.35, detectionDelay: 2.00 },
  { id: "agent-g", x: 0.90, z: -4.20, partnerId: "agent-h", pair: 3, seed: 7.15, detectionDelay: 1.10 },
  { id: "agent-h", x: 2.30, z: -3.90, partnerId: "agent-g", pair: 3, seed: 8.20, detectionDelay: 2.28 },
  { id: "agent-i", x: -3.40, z: -5.50, partnerId: "agent-j", pair: 4, seed: 9.30, detectionDelay: 1.45 },
  { id: "agent-j", x: -2.00, z: -5.80, partnerId: "agent-i", pair: 4, seed: 10.45, detectionDelay: 2.55 },
  { id: "agent-k", x: 2.00, z: -5.75, partnerId: "agent-l", pair: 5, seed: 11.30, detectionDelay: 1.75 },
  { id: "agent-l", x: 3.40, z: -5.45, partnerId: "agent-k", pair: 5, seed: 12.55, detectionDelay: 2.75 },
] as const;

const MINIMUM_THREAT_DISTANCE = 1.8;
const THREAT_START_Z = -16;
const BASELINE_END_SECONDS = 8;
const APPROACH_START_SECONDS = 11;

const CUE_EVENTS = [
  { id: "friendly-a", at: 350, duration: 520, sourceId: "agent-a", kind: "friendly", text: "Friendly tone → Agent B", gain: 0.15 },
  { id: "friendly-b", at: 1_050, duration: 470, sourceId: "agent-b", kind: "friendly", text: "Friendly reply → Agent A", gain: 0.14 },
  { id: "friendly-c", at: 1_650, duration: 520, sourceId: "agent-c", kind: "friendly", text: "Friendly tone → Agent D", gain: 0.16 },
  { id: "friendly-d", at: 2_320, duration: 470, sourceId: "agent-d", kind: "friendly", text: "Friendly reply → Agent C", gain: 0.14 },
  { id: "friendly-e", at: 2_920, duration: 520, sourceId: "agent-e", kind: "friendly", text: "Friendly tone → Agent F", gain: 0.15 },
  { id: "friendly-f", at: 3_590, duration: 470, sourceId: "agent-f", kind: "friendly", text: "Friendly reply → Agent E", gain: 0.14 },
  { id: "friendly-g", at: 4_180, duration: 520, sourceId: "agent-g", kind: "friendly", text: "Friendly tone → Agent H", gain: 0.16 },
  { id: "friendly-h", at: 4_850, duration: 470, sourceId: "agent-h", kind: "friendly", text: "Friendly reply → Agent G", gain: 0.14 },
  { id: "friendly-i", at: 5_440, duration: 520, sourceId: "agent-i", kind: "friendly", text: "Friendly tone → Agent J", gain: 0.15 },
  { id: "friendly-j", at: 6_110, duration: 470, sourceId: "agent-j", kind: "friendly", text: "Friendly reply → Agent I", gain: 0.14 },
  { id: "friendly-k", at: 6_700, duration: 520, sourceId: "agent-k", kind: "friendly", text: "Friendly tone → Agent L", gain: 0.16 },
  { id: "friendly-l", at: 7_370, duration: 470, sourceId: "agent-l", kind: "friendly", text: "Friendly reply → Agent K", gain: 0.14 },
  { id: "alarm-a", at: 8_120, duration: 950, sourceId: "agent-a", kind: "warning", text: "Did you hear that?", gain: 0.36 },
  { id: "alarm-c", at: 8_670, duration: 900, sourceId: "agent-c", kind: "warning", text: "Something is coming.", gain: 0.40 },
  { id: "alarm-e", at: 9_220, duration: 690, sourceId: "agent-e", kind: "gasp", text: "Look!", gain: 0.42 },
  { id: "alarm-g", at: 9_720, duration: 760, sourceId: "agent-g", kind: "warning", text: "Do you see it?", gain: 0.44 },
  { id: "alarm-i", at: 10_180, duration: 690, sourceId: "agent-i", kind: "warning", text: "Move!", gain: 0.47 },
  { id: "alarm-k", at: 10_620, duration: 620, sourceId: "agent-k", kind: "warning", text: "Go!", gain: 0.50 },
] as const satisfies ReadonlyArray<{
  id: string; at: number; duration: number; sourceId: string; kind: AudioCueKind; text: string; gain: number;
}>;

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function phaseFor(elapsedSeconds: number, running: boolean, approachEnd: number): ScenarioPhase {
  if (!running) return "ready";
  if (elapsedSeconds < BASELINE_END_SECONDS) return "baseline";
  if (elapsedSeconds < APPROACH_START_SECONDS) return "detected";
  if (elapsedSeconds < approachEnd) return "approach";
  if (elapsedSeconds < approachEnd + 4) return "hold";
  return "complete";
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

function lerpAngle(from: number, to: number, amount: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * clamp(amount);
}

export function scenarioDurationMs(intensity: Intensity) {
  return (intensity === "gentle" ? 33 : 27) * 1_000;
}

export function evaluateScenario(
  config: ScenarioConfig,
  elapsedMs: number,
  sessionId: string,
  options: { running?: boolean; paused?: boolean; lastCommandId?: string } = {},
): SceneSnapshot {
  const running = options.running ?? false;
  const paused = options.paused ?? false;
  const safeElapsedMs = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const seconds = safeElapsedMs / 1_000;
  const approachEnd = config.intensity === "gentle" ? 29 : 23;
  const phase = phaseFor(seconds, running, approachEnd);
  const approach = smoothstep((seconds - APPROACH_START_SECONDS) / (approachEnd - APPROACH_START_SECONDS));
  const threatZ = phase === "ready" || phase === "baseline" || phase === "detected"
    ? THREAT_START_Z
    : lerp(THREAT_START_Z, -MINIMUM_THREAT_DISTANCE, approach);
  const threatX = 0.18 * Math.sin(seconds * 0.77) * approach;
  const proximity = clamp((THREAT_START_Z - threatZ) / (THREAT_START_Z + MINIMUM_THREAT_DISTANCE));
  const threatVisibility = config.threatKind !== "angry-agent"
    ? (phase === "approach" || phase === "hold" || phase === "complete" ? smoothstep(proximity) : 0)
    : 1;

  const meandering = BASE_AGENTS.map((agent, index) => {
    const pairDrift = Math.sin(seconds * (0.23 + agent.pair * 0.025) + agent.pair * 1.7) * 0.07;
    return {
      x: agent.x + Math.sin(seconds * (0.34 + index * 0.013) + agent.seed) * (0.15 + (index % 2) * 0.035) + pairDrift,
      z: agent.z + Math.cos(seconds * (0.29 + index * 0.017) + agent.seed * 1.31) * (0.12 + (index % 3) * 0.025) - pairDrift * 0.45,
    };
  });

  const positionById = new Map(BASE_AGENTS.map((agent, index) => [agent.id, meandering[index]]));
  const detectedById = new Map(BASE_AGENTS.map((agent) => [agent.id, running && seconds >= BASELINE_END_SECONDS + agent.detectionDelay]));

  const agents = BASE_AGENTS.map((agent, index): AgentState => {
    const baseline = meandering[index];
    const partner = positionById.get(agent.partnerId)!;
    const detectedThreat = detectedById.get(agent.id) ?? false;
    const partnerDetected = detectedById.get(agent.partnerId) ?? false;
    const detectionAt = BASELINE_END_SECONDS + agent.detectionDelay;
    const alarmed = detectedThreat || (partnerDetected && seconds >= detectionAt - 0.58);
    const fear = detectedThreat ? smoothstep((seconds - detectionAt) / 1.35) : alarmed ? 0.28 : 0;

    const fromThreatX = baseline.x - threatX;
    const fromThreatZ = baseline.z - threatZ;
    const length = Math.max(0.01, Math.hypot(fromThreatX, fromThreatZ));
    const tangentX = -(fromThreatZ / length);
    const tangentZ = fromThreatX / length;
    const direction = index % 2 === 0 ? -1 : 1;
    const intensityScale = config.intensity === "gentle" ? 1.0 : 1.35;
    const fleeStrength = fear * (0.16 + proximity * 1.18 * intensityScale);
    const lateral = fear * proximity * (0.18 + (index % 3) * 0.09) * direction;
    const x = baseline.x + (fromThreatX / length) * fleeStrength + tangentX * lateral;
    const z = baseline.z + (fromThreatZ / length) * fleeStrength + tangentZ * lateral;

    const conversationCycle = (seconds + agent.pair * 1.45) % 7.2;
    const turn = (Math.floor((seconds + agent.pair * 0.63) / 2.35) + agent.pair) % 2;
    const isTalker = (turn === 0) === (index % 2 === 0);
    let behavior: AgentBehavior;
    if (!running) behavior = "idle";
    else if (!alarmed) behavior = conversationCycle < 4.75 ? (isTalker ? "talk" : "listen") : conversationCycle < 6.45 ? "meander" : "idle";
    else if (!detectedThreat) behavior = "orient";
    else if (seconds - detectionAt < 0.92) behavior = "startle";
    else if (phase === "hold" || phase === "complete") behavior = "freeze";
    else behavior = "flee";

    const socialYaw = yawToward(x, z, partner.x, partner.z)
      + Math.sin(seconds * 0.52 + agent.seed) * (behavior === "listen" ? 0.13 : 0.07);
    const threatYaw = yawToward(x, z, threatX, threatZ);
    const fleeYaw = yawToward(x, z, x + fromThreatX, z + fromThreatZ);
    const alertBlend = alarmed ? smoothstep((seconds - (detectionAt - 0.58)) / 0.6) : 0;

    return {
      id: agent.id,
      x,
      z,
      yaw: behavior === "flee" ? fleeYaw : lerpAngle(socialYaw, threatYaw, alertBlend),
      expression: fear > 0.46 ? "afraid" : alarmed ? "alert" : "calm",
      behavior,
      targetId: alarmed ? "threat" : agent.partnerId,
      speaking: false,
      detectedThreat,
      fear,
      gait: (seconds * (behavior === "flee" ? 2.9 + index * 0.09 : 0.72 + index * 0.04) + agent.seed) % 1,
      gesture: (seconds * (0.58 + index * 0.025) + agent.seed * 0.7) % 1,
    };
  });

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const audioCues = running ? CUE_EVENTS
    .filter((event) => safeElapsedMs >= event.at && safeElapsedMs < event.at + event.duration)
    .map((event): AudioCue => {
      const source = agentById.get(event.sourceId);
      return {
        id: `${sessionId}:${event.id}`,
        sourceId: event.sourceId,
        kind: event.kind,
        text: event.text,
        x: source?.x ?? threatX,
        z: source?.z ?? threatZ,
        gain: event.gain,
        startedAtMs: event.at,
        durationMs: event.duration,
      };
    }) : [];
  const threatSoundStartMs = 11_200;
  const threatSoundEndMs = (approachEnd + 4) * 1_000;
  if (running && safeElapsedMs >= threatSoundStartMs && safeElapsedMs < threatSoundEndMs) {
    audioCues.push({
      id: `${sessionId}:threat-loom`,
      sourceId: "threat",
      kind: config.threatKind === "spider" ? "spider-menace" : "roughness",
      text: config.threatKind === "spider" ? "Looming spider chitter" : "Looming rough drone",
      x: threatX,
      z: threatZ,
      gain: 0.34,
      startedAtMs: threatSoundStartMs,
      durationMs: threatSoundEndMs - threatSoundStartMs,
    });
  }
  const speakingIds = new Set(audioCues.filter((cue) => cue.sourceId !== "threat").map((cue) => cue.sourceId));
  for (const agent of agents) agent.speaking = speakingIds.has(agent.id);

  const socialLinks: SocialLink[] = [];
  for (let leftIndex = 0; leftIndex < agents.length; leftIndex += 2) {
    const rightIndex = leftIndex + 1;
    const left = agents[leftIndex];
    const right = agents[rightIndex];
    if (!left.detectedThreat && !right.detectedThreat) socialLinks.push({ sourceId: left.id, targetId: right.id, kind: "conversation" });
    else if (left.detectedThreat !== right.detectedThreat) socialLinks.push({
      sourceId: left.detectedThreat ? left.id : right.id,
      targetId: left.detectedThreat ? right.id : left.id,
      kind: "alarm",
    });
  }

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    sessionId,
    elapsedMs: Math.round(safeElapsedMs),
    phase,
    running,
    paused,
    config: { ...config },
    viewer: { x: 0, z: 0, yaw: 0 },
    agents,
    socialLinks,
    audioCues,
    threat: {
      kind: config.threatKind,
      x: threatX,
      z: threatZ,
      yaw: 0,
      expression: "angry",
      distance: Math.hypot(threatX, threatZ),
      visibility: threatVisibility,
    },
    minimumThreatDistance: MINIMUM_THREAT_DISTANCE,
    lastCommandId: options.lastCommandId,
  };
}

export function isScenarioComplete(snapshot: SceneSnapshot) {
  return snapshot.phase === "complete";
}
