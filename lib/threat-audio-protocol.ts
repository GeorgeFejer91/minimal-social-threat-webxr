export const THREAT_AUDIO_PROTOCOL_SCHEMA = "minimal-social-threat-spatial-audio.v1" as const;
export const PPS_KIT_REFERENCE_REVISION = "1c7ea7aa505efbde61b24c1b0f5c943bd842edb2" as const;

export const TAFFOU_ROUGHNESS_PROFILE = {
  id: "taffou-rough-loom-reconstruction-v1",
  durationS: 3,
  fundamentalHz: 500,
  harmonicFrequenciesHz: [500, 1_000, 1_500, 2_000, 2_500, 3_000, 3_500, 4_000],
  relativeAmplitudes: [1, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
  modulationHz: 70,
  modulationDepth: 1,
  roughLevelAdjustmentDb: -0.8,
  evidence: "Taffou, Suied, and Viaud-Delmon (2021), doi:10.1038/s41598-020-79767-0",
  status: "methods-derived reconstruction; unspecified approximately-0.25 harmonic amplitudes require local validation",
} as const;

export const PPS_BURST_TRAIN_PROFILE = {
  id: "pps-kit-dynaspace-gaussian-burst-train-adaptation-v1",
  sourceKind: "deterministic-broadband-noise",
  onsetS: 0.3,
  burstDurationS: 0.03,
  riseFallS: 0.01,
  targetPeriodS: 0.095,
  spacingPolicy: "fixed-period-continuous-runtime",
  referenceRepository: "https://github.com/GeorgeFejer91/pps-kit",
  referenceRevision: PPS_KIT_REFERENCE_REVISION,
  status: "PPS localization adaptation; not independently validated as a threat inducer",
} as const;

export const THREAT_DISTANCE_LEVEL_POLICY = {
  id: "controlled-relative-loom-minus18-to-0db-v1",
  startDistanceM: 16,
  endpointDistanceM: 1.8,
  startRelativeDb: -18,
  endpointRelativeDb: 0,
  rampShape: "linear-db-over-normalized-distance",
  pannerDistanceGain: false,
  propagationDelay: true,
  speedOfSoundMps: 343,
  calibrationStatus: "relative-digital-level-only; no dB SPL claim",
} as const;

export const THREAT_SOURCE_HEIGHT_POLICY = {
  id: "scene-threat-kind-visual-anchor-v1",
  shadowM: 1.55,
  angryAgentM: 1.55,
  spiderM: 0.42,
} as const;

export const THREAT_AUDIO_PROTOCOL = {
  schema: THREAT_AUDIO_PROTOCOL_SCHEMA,
  id: "pps-separated-spatial-threat-cues-v1",
  ppsKitRevision: PPS_KIT_REFERENCE_REVISION,
  localizationProfileId: PPS_BURST_TRAIN_PROFILE.id,
  defensiveProfileId: TAFFOU_ROUGHNESS_PROFILE.id,
  renderer: "web-audio-pannernode-hrtf",
  sourceHeightPolicyId: THREAT_SOURCE_HEIGHT_POLICY.id,
  levelPolicyId: THREAT_DISTANCE_LEVEL_POLICY.id,
  calibrationStatus: THREAT_DISTANCE_LEVEL_POLICY.calibrationStatus,
  bundledRecording: false,
} as const;

export type ThreatAudioProtocolSnapshot = typeof THREAT_AUDIO_PROTOCOL;

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

export function dbToLinear(db: number) {
  return 10 ** (db / 20);
}

export function threatApproachProgress(distanceM: number) {
  const { startDistanceM, endpointDistanceM } = THREAT_DISTANCE_LEVEL_POLICY;
  return clamp((startDistanceM - distanceM) / (startDistanceM - endpointDistanceM));
}

export function threatRelativeLevelDb(distanceM: number) {
  const progress = threatApproachProgress(distanceM);
  return THREAT_DISTANCE_LEVEL_POLICY.startRelativeDb
    + progress * (THREAT_DISTANCE_LEVEL_POLICY.endpointRelativeDb - THREAT_DISTANCE_LEVEL_POLICY.startRelativeDb);
}

export function threatDistanceGain(distanceM: number) {
  return dbToLinear(threatRelativeLevelDb(distanceM));
}

export function propagationDelaySeconds(distanceM: number) {
  return Math.max(0, distanceM) / THREAT_DISTANCE_LEVEL_POLICY.speedOfSoundMps;
}

export function threatSourceHeightM(kind: "shadow" | "angry-agent" | "spider") {
  if (kind === "spider") return THREAT_SOURCE_HEIGHT_POLICY.spiderM;
  return kind === "angry-agent" ? THREAT_SOURCE_HEIGHT_POLICY.angryAgentM : THREAT_SOURCE_HEIGHT_POLICY.shadowM;
}

export function ppsBurstEnvelopeAt(timeFromCueStartS: number) {
  const { onsetS, burstDurationS, riseFallS, targetPeriodS } = PPS_BURST_TRAIN_PROFILE;
  if (timeFromCueStartS < onsetS) return 0;
  const local = (timeFromCueStartS - onsetS) % targetPeriodS;
  if (local < 0 || local >= burstDurationS) return 0;
  if (local < riseFallS) return 0.5 - 0.5 * Math.cos(Math.PI * local / riseFallS);
  const releaseStart = burstDurationS - riseFallS;
  if (local > releaseStart) return 0.5 - 0.5 * Math.cos(Math.PI * (burstDurationS - local) / riseFallS);
  return 1;
}

export function isThreatAudioProtocolSnapshot(value: unknown): value is ThreatAudioProtocolSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return Object.keys(item).length === Object.keys(THREAT_AUDIO_PROTOCOL).length
    && Object.entries(THREAT_AUDIO_PROTOCOL).every(([key, expected]) => item[key] === expected);
}
