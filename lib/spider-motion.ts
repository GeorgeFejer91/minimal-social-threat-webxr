import { SCENARIO_TIMING, type Intensity, type ScenarioPhase } from "./scenario.ts";

export type SpiderLegSide = -1 | 1;

export interface SpiderLegPose {
  side: SpiderLegSide;
  pair: 0 | 1 | 2 | 3;
  attachmentZ: number;
  sweep: number;
  lift: number;
  kneeFlex: number;
}

export interface SpiderMotionPose {
  legs: SpiderLegPose[];
  bodyBob: number;
  bodyYaw: number;
  mandible: number;
}

const APPROACH_START_MS = SCENARIO_TIMING.baselineEndSeconds * 1_000;
const PAIR_ATTACHMENT_Z = [0.34, 0.12, -0.12, -0.34] as const;
const PAIR_SWEEP = [-0.78, -0.29, 0.29, 0.78] as const;

/**
 * Deterministic alternating-tetrapod gait derived only from authoritative scene time.
 * Left/right leg groups alternate so four feet recover while four remain in stance.
 */
export function spiderMotionPose(
  elapsedMs: number,
  phase: ScenarioPhase,
  intensity: Intensity,
): SpiderMotionPose {
  const approachEndMs = (intensity === "gentle"
    ? SCENARIO_TIMING.gentleApproachEndSeconds
    : SCENARIO_TIMING.standardApproachEndSeconds) * 1_000;
  const linearProgress = Math.min(1, Math.max(0, (elapsedMs - APPROACH_START_MS) / (approachEndMs - APPROACH_START_MS)));
  const smoothProgress = linearProgress * linearProgress * (3 - 2 * linearProgress);
  const distanceProgress = linearProgress * 0.28 + smoothProgress * 0.72;
  const normalizedSpeed = (0.28 + 4.32 * linearProgress * (1 - linearProgress)) / 1.36;
  const locomotion = phase === "detected" || phase === "approach" ? normalizedSpeed : 0;
  const cyclesAcrossApproach = intensity === "gentle" ? 28 : 22;
  const cycle = distanceProgress * cyclesAcrossApproach * Math.PI * 2;
  const legs: SpiderLegPose[] = [];

  for (const side of [-1, 1] as const) {
    for (let pair = 0; pair < 4; pair += 1) {
      const tetrapodGroup = (pair + (side === 1 ? 0 : 1)) % 2;
      const legCycle = cycle + tetrapodGroup * Math.PI;
      const lift = Math.max(0, Math.sin(legCycle)) * locomotion;
      const stanceDrive = Math.cos(legCycle) * locomotion;
      legs.push({
        side,
        pair: pair as 0 | 1 | 2 | 3,
        attachmentZ: PAIR_ATTACHMENT_Z[pair],
        sweep: PAIR_SWEEP[pair] + stanceDrive * 0.19,
        lift,
        kneeFlex: lift * 0.16 - Math.min(0, Math.sin(legCycle)) * locomotion * 0.045,
      });
    }
  }

  return {
    legs,
    bodyBob: locomotion * (0.012 + Math.abs(Math.sin(cycle * 2)) * 0.025),
    bodyYaw: locomotion * Math.sin(cycle) * 0.028,
    mandible: 0.08 + (phase === "approach" || phase === "hold" ? Math.abs(Math.sin(cycle * 1.7)) * 0.09 : 0),
  };
}
