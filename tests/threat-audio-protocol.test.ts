import assert from "node:assert/strict";
import test from "node:test";
import {
  PPS_BURST_TRAIN_PROFILE,
  TAFFOU_ROUGHNESS_PROFILE,
  THREAT_AUDIO_PROTOCOL,
  THREAT_DISTANCE_LEVEL_POLICY,
  ppsBurstEnvelopeAt,
  propagationDelaySeconds,
  threatSourceHeightM,
  threatDistanceGain,
  threatRelativeLevelDb,
} from "../lib/threat-audio-protocol.ts";

test("roughness reconstruction exposes the published three-second 70 Hz harmonic method", () => {
  assert.equal(TAFFOU_ROUGHNESS_PROFILE.durationS, 3);
  assert.equal(TAFFOU_ROUGHNESS_PROFILE.fundamentalHz, 500);
  assert.equal(TAFFOU_ROUGHNESS_PROFILE.modulationHz, 70);
  assert.equal(TAFFOU_ROUGHNESS_PROFILE.modulationDepth, 1);
  assert.deepEqual(TAFFOU_ROUGHNESS_PROFILE.harmonicFrequenciesHz, [500, 1_000, 1_500, 2_000, 2_500, 3_000, 3_500, 4_000]);
  assert.equal(TAFFOU_ROUGHNESS_PROFILE.roughLevelAdjustmentDb, -0.8);
});

test("PPS burst train preserves the borrowed dry-source timing contract", () => {
  assert.equal(PPS_BURST_TRAIN_PROFILE.onsetS, 0.3);
  assert.equal(PPS_BURST_TRAIN_PROFILE.burstDurationS, 0.03);
  assert.equal(PPS_BURST_TRAIN_PROFILE.riseFallS, 0.01);
  assert.equal(PPS_BURST_TRAIN_PROFILE.targetPeriodS, 0.095);
  assert.equal(ppsBurstEnvelopeAt(0.299), 0);
  assert.ok(ppsBurstEnvelopeAt(0.305) > 0 && ppsBurstEnvelopeAt(0.305) < 1);
  assert.equal(ppsBurstEnvelopeAt(0.315), 1);
  assert.equal(ppsBurstEnvelopeAt(0.335), 0);
  assert.ok(ppsBurstEnvelopeAt(0.4) > 0);
});

test("one relative dB law owns threat distance while propagation delay shrinks on approach", () => {
  const { startDistanceM, endpointDistanceM, startRelativeDb, endpointRelativeDb } = THREAT_DISTANCE_LEVEL_POLICY;
  assert.equal(threatRelativeLevelDb(startDistanceM), startRelativeDb);
  assert.equal(threatRelativeLevelDb(endpointDistanceM), endpointRelativeDb);
  assert.ok(threatDistanceGain(startDistanceM) < threatDistanceGain(8));
  assert.ok(threatDistanceGain(8) < threatDistanceGain(endpointDistanceM));
  assert.ok(propagationDelaySeconds(startDistanceM) > propagationDelaySeconds(endpointDistanceM));
  assert.equal(THREAT_AUDIO_PROTOCOL.calibrationStatus, "relative-digital-level-only; no dB SPL claim");
});

test("threat cue height follows the visible threat body", () => {
  assert.equal(threatSourceHeightM("shadow"), 1.55);
  assert.equal(threatSourceHeightM("angry-agent"), 1.55);
  assert.equal(threatSourceHeightM("spider"), 0.42);
});
