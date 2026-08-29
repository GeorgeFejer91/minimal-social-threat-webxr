import { THREAT_AUDIO_PROTOCOL, threatSourceHeightM, type ThreatAudioProtocolSnapshot } from "./threat-audio-protocol.ts";

export const SCENE_SCHEMA_VERSION = 6 as const;

export type ThreatKind = "shadow" | "angry-agent" | "spider";
export type AgentStyle = "minimal" | "human";
export type Intensity = "gentle" | "standard";
export type SceneMode = "virtual" | "passthrough";
export type Expression = "calm" | "alert" | "afraid" | "angry";
export type AgentBehavior = "idle" | "meander" | "talk" | "listen" | "orient" | "startle" | "flee" | "freeze";
export type ScenarioPhase = "ready" | "baseline" | "detected" | "approach" | "hold" | "complete";
export type AudioCueKind = "friendly" | "murmur" | "acknowledge" | "warning" | "gasp" | "pps-looming-bursts" | "roughness" | "spider-menace";

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
  awareness: number;
  fear: number;
  avoidance: number;
  locomotion: number;
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
  y: number;
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
  audioProtocol: ThreatAudioProtocolSnapshot;
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
  { id: "agent-a", x: -3.80, z: -2.50, partnerId: "agent-b", pair: 0, seed: 0.35, detectionDelay: 2.40 },
  { id: "agent-b", x: -2.60, z: -2.80, partnerId: "agent-a", pair: 0, seed: 1.70, detectionDelay: 8.50 },
  { id: "agent-c", x: 2.55, z: -2.75, partnerId: "agent-d", pair: 1, seed: 2.85, detectionDelay: 3.20 },
  { id: "agent-d", x: 3.80, z: -2.45, partnerId: "agent-c", pair: 1, seed: 4.10, detectionDelay: 9.60 },
  { id: "agent-e", x: -2.30, z: -4.00, partnerId: "agent-f", pair: 2, seed: 5.20, detectionDelay: 4.30 },
  { id: "agent-f", x: -0.90, z: -4.25, partnerId: "agent-e", pair: 2, seed: 6.35, detectionDelay: 10.70 },
  { id: "agent-g", x: 0.90, z: -4.20, partnerId: "agent-h", pair: 3, seed: 7.15, detectionDelay: 5.20 },
  { id: "agent-h", x: 2.30, z: -3.90, partnerId: "agent-g", pair: 3, seed: 8.20, detectionDelay: 11.50 },
  { id: "agent-i", x: -3.40, z: -5.50, partnerId: "agent-j", pair: 4, seed: 9.30, detectionDelay: 6.00 },
  { id: "agent-j", x: -2.00, z: -5.80, partnerId: "agent-i", pair: 4, seed: 10.45, detectionDelay: 12.20 },
  { id: "agent-k", x: 2.00, z: -5.75, partnerId: "agent-l", pair: 5, seed: 11.30, detectionDelay: 7.20 },
  { id: "agent-l", x: 3.40, z: -5.45, partnerId: "agent-k", pair: 5, seed: 12.55, detectionDelay: 13.00 },
] as const;

const MINIMUM_THREAT_DISTANCE = 1.8;
const THREAT_START_Z = -16;
export const SCENARIO_TIMING = {
  baselineEndSeconds: 12,
  awarenessEndSeconds: 18,
  standardApproachEndSeconds: 38,
  gentleApproachEndSeconds: 48,
  holdSeconds: 4,
} as const;
const APPROACH_START_SECONDS = SCENARIO_TIMING.baselineEndSeconds;

const CUE_EVENTS = [
  { id: "social-a-call", at: 500, duration: 920, sourceId: "agent-a", kind: "friendly", text: "Warm tone → Agent B", gain: 0.13 },
  { id: "social-b-reply", at: 1_520, duration: 760, sourceId: "agent-b", kind: "acknowledge", text: "Gentle reply → Agent A", gain: 0.12 },
  { id: "social-c-call", at: 2_180, duration: 960, sourceId: "agent-c", kind: "friendly", text: "Warm tone → Agent D", gain: 0.13 },
  { id: "social-d-reply", at: 3_230, duration: 780, sourceId: "agent-d", kind: "acknowledge", text: "Gentle reply → Agent C", gain: 0.12 },
  { id: "social-e-call", at: 3_840, duration: 940, sourceId: "agent-e", kind: "friendly", text: "Warm tone → Agent F", gain: 0.13 },
  { id: "social-f-reply", at: 4_860, duration: 760, sourceId: "agent-f", kind: "acknowledge", text: "Gentle reply → Agent E", gain: 0.12 },
  { id: "social-group-one", at: 5_420, duration: 1_100, sourceId: "agent-g", kind: "murmur", text: "Soft group murmur", gain: 0.105 },
  { id: "social-h-reply", at: 6_260, duration: 780, sourceId: "agent-h", kind: "acknowledge", text: "Easy response → Agent G", gain: 0.115 },
  { id: "social-i-call", at: 6_920, duration: 960, sourceId: "agent-i", kind: "friendly", text: "Warm tone → Agent J", gain: 0.13 },
  { id: "social-j-reply", at: 7_960, duration: 780, sourceId: "agent-j", kind: "acknowledge", text: "Gentle reply → Agent I", gain: 0.12 },
  { id: "social-k-call", at: 8_620, duration: 940, sourceId: "agent-k", kind: "friendly", text: "Warm tone → Agent L", gain: 0.13 },
  { id: "social-l-reply", at: 9_640, duration: 760, sourceId: "agent-l", kind: "acknowledge", text: "Gentle reply → Agent K", gain: 0.12 },
  { id: "social-group-two", at: 10_220, duration: 1_080, sourceId: "agent-e", kind: "murmur", text: "Pleasant shared murmur", gain: 0.105 },
  { id: "social-group-reply", at: 11_150, duration: 720, sourceId: "agent-g", kind: "acknowledge", text: "Soft answering tone", gain: 0.11 },
  { id: "alarm-a", at: 14_550, duration: 820, sourceId: "agent-a", kind: "warning", text: "A cautious warning", gain: 0.31 },
  { id: "alarm-c", at: 15_450, duration: 840, sourceId: "agent-c", kind: "warning", text: "Something is approaching", gain: 0.34 },
  { id: "alarm-e", at: 16_550, duration: 720, sourceId: "agent-e", kind: "gasp", text: "A startled breath", gain: 0.36 },
  { id: "alarm-g", at: 17_550, duration: 780, sourceId: "agent-g", kind: "warning", text: "Unease spreads", gain: 0.38 },
  { id: "alarm-i", at: 18_650, duration: 760, sourceId: "agent-i", kind: "warning", text: "Move away", gain: 0.42 },
  { id: "alarm-k", at: 19_850, duration: 700, sourceId: "agent-k", kind: "warning", text: "Go", gain: 0.45 },
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
  if (elapsedSeconds < SCENARIO_TIMING.baselineEndSeconds) return "baseline";
  if (elapsedSeconds < SCENARIO_TIMING.awarenessEndSeconds) return "detected";
  if (elapsedSeconds < approachEnd) return "approach";
  if (elapsedSeconds < approachEnd + SCENARIO_TIMING.holdSeconds) return "hold";
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
  const approachEnd = intensity === "gentle"
    ? SCENARIO_TIMING.gentleApproachEndSeconds
    : SCENARIO_TIMING.standardApproachEndSeconds;
  return (approachEnd + SCENARIO_TIMING.holdSeconds) * 1_000;
}

interface AgentResponse {
  detectedThreat: boolean;
  alarmed: boolean;
  awareness: number;
  fear: number;
  avoidance: number;
}

const BASE_AGENT_BY_ID = new Map(BASE_AGENTS.map((agent) => [agent.id, agent]));

function threatApproachAt(seconds: number, approachEnd: number) {
  const linearProgress = clamp((seconds - APPROACH_START_SECONDS) / (approachEnd - APPROACH_START_SECONDS));
  return linearProgress * 0.28 + smoothstep(linearProgress) * 0.72;
}

function threatPositionAt(seconds: number, approachEnd: number) {
  const approach = threatApproachAt(seconds, approachEnd);
  return {
    approach,
    x: 0.2 * Math.sin(seconds * 0.63) * smoothstep(approach),
    z: lerp(THREAT_START_Z, -MINIMUM_THREAT_DISTANCE, approach),
  };
}

function agentResponseAt(agent: AgentDefinition, seconds: number, proximity: number): AgentResponse {
  const partner = BASE_AGENT_BY_ID.get(agent.partnerId)!;
  const detectionAt = APPROACH_START_SECONDS + agent.detectionDelay;
  const partnerAlarmAt = APPROACH_START_SECONDS + partner.detectionDelay + 0.85 + (agent.pair % 3) * 0.12;
  const alarmAt = Math.min(detectionAt, partnerAlarmAt);
  const detectedThreat = seconds >= detectionAt;
  const alarmed = seconds >= alarmAt;
  const awareness = alarmed ? smoothstep((seconds - alarmAt) / (4.1 + agent.pair * 0.08)) : 0;
  const directAwareness = detectedThreat ? smoothstep((seconds - detectionAt) / 5.2) : 0;
  const fear = alarmed
    ? clamp(awareness * (0.1 + proximity * 0.52) + directAwareness * (0.16 + proximity * 0.24))
    : 0;
  const avoidance = smoothstep((fear - 0.08) / 0.82) * smoothstep(proximity / 0.82);
  return { detectedThreat, alarmed, awareness, fear, avoidance };
}

function agentPositionAt(
  agent: AgentDefinition,
  index: number,
  seconds: number,
  approachEnd: number,
  intensity: Intensity,
) {
  const threat = threatPositionAt(seconds, approachEnd);
  const response = agentResponseAt(agent, seconds, threat.approach);
  const socialWeight = 1 - smoothstep(response.awareness);
  const pairDrift = Math.sin(seconds * (0.23 + agent.pair * 0.025) + agent.pair * 1.7) * 0.07 * socialWeight;
  const socialX = agent.x
    + Math.sin(seconds * (0.34 + index * 0.013) + agent.seed) * (0.15 + (index % 2) * 0.035) * socialWeight
    + pairDrift;
  const socialZ = agent.z
    + Math.cos(seconds * (0.29 + index * 0.017) + agent.seed * 1.31) * (0.12 + (index % 3) * 0.025) * socialWeight
    - pairDrift * 0.45;

  const fromThreatX = socialX - threat.x;
  const fromThreatZ = socialZ - threat.z;
  const length = Math.max(0.01, Math.hypot(fromThreatX, fromThreatZ));
  const outwardSide = agent.x < 0 ? -1 : 1;
  const escapeScale = intensity === "gentle" ? 0.92 : 1.08;
  const lateralEscape = outwardSide * (1.55 + (index % 3) * 0.38) * escapeScale;
  const depthStagger = (((index + agent.pair) % 3) - 1) * 0.28 * escapeScale;
  return {
    x: socialX + response.avoidance * (lateralEscape + (fromThreatX / length) * 0.46),
    z: socialZ + response.avoidance * (depthStagger + (fromThreatZ / length) * 0.68),
    response,
    threat,
  };
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
  const activeSeconds = running ? seconds : 0;
  const approachEnd = config.intensity === "gentle"
    ? SCENARIO_TIMING.gentleApproachEndSeconds
    : SCENARIO_TIMING.standardApproachEndSeconds;
  const phase = phaseFor(seconds, running, approachEnd);
  const threatMotion = threatPositionAt(activeSeconds, approachEnd);
  const approach = running ? threatMotion.approach : 0;
  const threatZ = running ? threatMotion.z : THREAT_START_Z;
  const threatX = running ? threatMotion.x : 0;
  const proximity = approach;
  const threatVisibility = config.threatKind !== "angry-agent"
    ? smoothstep((proximity - 0.015) / 0.84)
    : 1;

  const kinematics = BASE_AGENTS.map((agent, index) => agentPositionAt(agent, index, activeSeconds, approachEnd, config.intensity));
  const positionById = new Map(BASE_AGENTS.map((agent, index) => [agent.id, kinematics[index]]));

  const agents = BASE_AGENTS.map((agent, index): AgentState => {
    const current = kinematics[index];
    const previous = agentPositionAt(agent, index, Math.max(0, activeSeconds - 0.12), approachEnd, config.intensity);
    const partner = positionById.get(agent.partnerId)!;
    const { detectedThreat, alarmed, awareness, fear, avoidance } = current.response;
    const x = current.x;
    const z = current.z;
    const fromThreatX = x - threatX;
    const fromThreatZ = z - threatZ;
    const speed = Math.hypot(x - previous.x, z - previous.z) / 0.12;
    const locomotion = running && phase !== "hold" && phase !== "complete" ? clamp(speed / 0.42) : 0;

    const conversationCycle = (seconds + agent.pair * 1.45) % 7.2;
    const turn = (Math.floor((seconds + agent.pair * 0.63) / 2.35) + agent.pair) % 2;
    const isTalker = (turn === 0) === (index % 2 === 0);
    let behavior: AgentBehavior;
    if (!running) behavior = "idle";
    else if (!alarmed) behavior = conversationCycle < 4.75 ? (isTalker ? "talk" : "listen") : conversationCycle < 6.45 ? "meander" : "idle";
    else if ((phase === "hold" || phase === "complete") && locomotion < 0.04) behavior = "freeze";
    else if (awareness < 0.3) behavior = "orient";
    else if (avoidance < 0.38) behavior = "startle";
    else behavior = "flee";

    const socialYaw = yawToward(x, z, partner.x, partner.z)
      + Math.sin(seconds * 0.52 + agent.seed) * (behavior === "listen" ? 0.13 : 0.07);
    const threatYaw = yawToward(x, z, threatX, threatZ);
    const fleeYaw = yawToward(x, z, x + fromThreatX, z + fromThreatZ);
    const orientedYaw = lerpAngle(socialYaw, threatYaw, awareness * (1 - avoidance));

    return {
      id: agent.id,
      x,
      z,
      yaw: lerpAngle(orientedYaw, fleeYaw, avoidance),
      expression: fear > 0.46 ? "afraid" : alarmed ? "alert" : "calm",
      behavior,
      targetId: alarmed ? "threat" : agent.partnerId,
      speaking: false,
      detectedThreat,
      awareness,
      fear,
      avoidance,
      locomotion,
      gait: (seconds * (0.55 + index * 0.025) + avoidance * (2.4 + index * 0.08) + agent.seed) % 1,
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
        y: 1.42,
        z: source?.z ?? threatZ,
        gain: event.gain,
        startedAtMs: event.at,
        durationMs: event.duration,
      };
    }) : [];
  const approachStartMs = APPROACH_START_SECONDS * 1_000;
  const approachEndMs = approachEnd * 1_000;
  const threatCueHeight = threatSourceHeightM(config.threatKind);
  if (running && safeElapsedMs >= approachStartMs && safeElapsedMs < approachEndMs) {
    audioCues.push({
      id: `${sessionId}:threat-localizer`,
      sourceId: "threat",
      kind: "pps-looming-bursts",
      text: "PPS burst-train approach localizer",
      x: threatX,
      y: threatCueHeight,
      z: threatZ,
      gain: 0.22,
      startedAtMs: approachStartMs,
      durationMs: approachEndMs - approachStartMs,
    });
  }
  const roughThreatStartMs = approachEndMs - 3_000;
  if (running && safeElapsedMs >= roughThreatStartMs && safeElapsedMs < approachEndMs) {
    audioCues.push({
      id: `${sessionId}:threat-roughness`,
      sourceId: "threat",
      kind: config.threatKind === "spider" ? "spider-menace" : "roughness",
      text: "Three-second 70 Hz rough defensive cue",
      x: threatX,
      y: threatCueHeight,
      z: threatZ,
      gain: 0.34,
      startedAtMs: roughThreatStartMs,
      durationMs: 3_000,
    });
  }
  const speakingIds = new Set(audioCues.filter((cue) => cue.sourceId !== "threat").map((cue) => cue.sourceId));
  for (const agent of agents) agent.speaking = speakingIds.has(agent.id);

  const socialLinks: SocialLink[] = [];
  for (let leftIndex = 0; leftIndex < agents.length; leftIndex += 2) {
    const rightIndex = leftIndex + 1;
    const left = agents[leftIndex];
    const right = agents[rightIndex];
    const leftAlarmed = left.awareness > 0;
    const rightAlarmed = right.awareness > 0;
    if (!leftAlarmed && !rightAlarmed) socialLinks.push({ sourceId: left.id, targetId: right.id, kind: "conversation" });
    else if (leftAlarmed !== rightAlarmed) socialLinks.push({
      sourceId: leftAlarmed ? left.id : right.id,
      targetId: leftAlarmed ? right.id : left.id,
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
    audioProtocol: THREAT_AUDIO_PROTOCOL,
    threat: {
      kind: config.threatKind,
      x: threatX,
      z: threatZ,
      yaw: yawToward(threatX, threatZ, 0, 0),
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
