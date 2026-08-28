export const SCENE_SCHEMA_VERSION = 1 as const;

export type ThreatKind = "tiger" | "angry-agent";
export type Intensity = "gentle" | "standard";
export type SceneMode = "virtual" | "passthrough";
export type Expression = "calm" | "alert" | "afraid" | "angry";
export type ScenarioPhase = "ready" | "baseline" | "detected" | "approach" | "hold" | "complete";

export interface ScenarioConfig {
  threatKind: ThreatKind;
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
}

export interface ThreatState {
  kind: ThreatKind;
  x: number;
  z: number;
  yaw: number;
  expression: "angry";
  distance: number;
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
  threat: ThreatState;
  minimumThreatDistance: number;
  lastCommandId?: string;
}

const BASE_AGENTS = [
  { id: "agent-a", x: -2.65, z: -1.55 },
  { id: "agent-b", x: 0, z: -3.15 },
  { id: "agent-c", x: 2.65, z: -1.55 },
  { id: "agent-d", x: 2.85, z: 1.45 },
  { id: "agent-e", x: 0, z: 3.05 },
  { id: "agent-f", x: -2.85, z: 1.45 },
] as const;

const MINIMUM_THREAT_DISTANCE = 1.8;
const THREAT_START_Z = -8.2;

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
  if (elapsedSeconds < 4) return "baseline";
  if (elapsedSeconds < 7) return "detected";
  if (elapsedSeconds < approachEnd) return "approach";
  if (elapsedSeconds < approachEnd + 4) return "hold";
  return "complete";
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function scenarioDurationMs(intensity: Intensity) {
  return (intensity === "gentle" ? 29 : 23) * 1_000;
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
  const approachEnd = config.intensity === "gentle" ? 25 : 19;
  const phase = phaseFor(seconds, running, approachEnd);
  const approach = smoothstep((seconds - 7) / (approachEnd - 7));
  const threatZ = phase === "ready" || phase === "baseline"
    ? THREAT_START_Z
    : lerp(THREAT_START_Z, -MINIMUM_THREAT_DISTANCE, approach);
  const threatX = 0.16 * Math.sin(seconds * 0.85) * approach;
  const detected = smoothstep((seconds - 4) / 3);
  const proximity = clamp((THREAT_START_Z - threatZ) / (THREAT_START_Z + MINIMUM_THREAT_DISTANCE));

  const agents = BASE_AGENTS.map((agent, index): AgentState => {
    const fromThreatX = agent.x - threatX;
    const fromThreatZ = agent.z - threatZ;
    const length = Math.max(0.01, Math.hypot(fromThreatX, fromThreatZ));
    const fleeStrength = detected * (0.25 + proximity * (config.intensity === "gentle" ? 1.15 : 1.7));
    const sideBias = (index % 2 === 0 ? -1 : 1) * proximity * 0.25;
    const x = agent.x + (fromThreatX / length) * fleeStrength + sideBias;
    const z = agent.z + (fromThreatZ / length) * fleeStrength + proximity * 0.18;
    return {
      id: agent.id,
      x,
      z,
      yaw: yawToward(x, z, threatX, threatZ),
      expression: phase === "ready" || phase === "baseline" ? "calm" : phase === "detected" ? "alert" : "afraid",
    };
  });

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
    threat: {
      kind: config.threatKind,
      x: threatX,
      z: threatZ,
      yaw: 0,
      expression: "angry",
      distance: Math.hypot(threatX, threatZ),
    },
    minimumThreatDistance: MINIMUM_THREAT_DISTANCE,
    lastCommandId: options.lastCommandId,
  };
}

export function isScenarioComplete(snapshot: SceneSnapshot) {
  return snapshot.phase === "complete";
}

