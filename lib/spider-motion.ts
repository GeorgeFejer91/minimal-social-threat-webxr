import type { Intensity, ScenarioPhase } from "./scenario";

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

const APPROACH_START_MS = 11_000;
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
  const locomotion = phase === "approach" ? 1 : phase === "hold" ? 0.12 : 0;
  const angularRate = intensity === "gentle" ? 0.0068 : 0.0086;
  const cycle = Math.max(0, elapsedMs - APPROACH_START_MS) * angularRate;
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
