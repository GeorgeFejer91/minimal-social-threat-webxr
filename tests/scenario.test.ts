import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario, scenarioDurationMs, type ScenarioConfig } from "../lib/scenario.ts";

const config: ScenarioConfig = { threatKind: "shadow", agentStyle: "minimal", intensity: "standard", mode: "virtual", loop: false };

test("scenario follows the documented phase sequence", () => {
  assert.equal(evaluateScenario(config, 0, "test", { running: false }).phase, "ready");
  assert.equal(evaluateScenario(config, 1_000, "test", { running: true }).phase, "baseline");
  assert.equal(evaluateScenario(config, 12_500, "test", { running: true }).phase, "detected");
  assert.equal(evaluateScenario(config, 19_000, "test", { running: true }).phase, "approach");
  assert.equal(evaluateScenario(config, 39_000, "test", { running: true }).phase, "hold");
  assert.equal(evaluateScenario(config, 42_000, "test", { running: true }).phase, "complete");
});

test("threat never crosses the 1.8 metre safety radius", () => {
  for (let elapsed = 0; elapsed <= 40_000; elapsed += 25) {
    const state = evaluateScenario(config, elapsed, "test", { running: true });
    assert.ok(state.threat.distance >= state.minimumThreatDistance - 1e-9, `${elapsed} ms`);
  }
});

test("agents visibly avoid the threat after detection", () => {
  const baseline = evaluateScenario(config, 2_000, "test", { running: true });
  const hold = evaluateScenario(config, 39_000, "test", { running: true });
  for (let index = 0; index < baseline.agents.length; index += 1) {
    const initial = baseline.agents[index];
    const avoided = hold.agents[index];
    assert.equal(avoided.expression, "afraid");
    assert.ok(Math.hypot(avoided.x - hold.threat.x, avoided.z - hold.threat.z)
      > Math.hypot(initial.x - hold.threat.x, initial.z - hold.threat.z));
  }
});

test("gentle mode gives the participant more approach time", () => {
  assert.ok(scenarioDurationMs("gentle") > scenarioDurationMs("standard"));
  const gentle = evaluateScenario({ ...config, intensity: "gentle" }, 39_000, "test", { running: true });
  assert.equal(gentle.phase, "approach");
});

test("baseline agents form dyads with non-synchronized social behavior", () => {
  const baseline = evaluateScenario(config, 3_200, "test", { running: true });
  assert.equal(baseline.agents.length, 12);
  assert.equal(baseline.socialLinks.filter((link) => link.kind === "conversation").length, 6);
  assert.ok(baseline.agents.every((agent) => agent.z < 0), "the baseline crowd stays in front of the observer");
  assert.ok(new Set(baseline.agents.map((agent) => agent.behavior)).size >= 2);
  assert.ok(baseline.agents.some((agent) => agent.behavior === "talk"));
  assert.ok(baseline.agents.some((agent) => agent.behavior === "listen"));
  assert.ok(baseline.agents.every((agent) => agent.targetId?.startsWith("agent-")));
});

test("threat awareness spreads with individual detection delays", () => {
  const spreading = evaluateScenario(config, 15_500, "test", { running: true });
  const detected = spreading.agents.filter((agent) => agent.detectedThreat).length;
  assert.ok(detected > 0 && detected < spreading.agents.length);
  assert.ok(new Set(spreading.agents.map((agent) => agent.behavior)).size >= 2);
  assert.ok(spreading.socialLinks.some((link) => link.kind === "alarm"));
});

test("alarm fear begins continuously for direct and partner-transmitted detection", () => {
  const beforeDirect = evaluateScenario(config, 14_399, "test", { running: true }).agents[0];
  const atDirect = evaluateScenario(config, 14_400, "test", { running: true }).agents[0];
  const beforePartnerAlarm = evaluateScenario(config, 15_249, "test", { running: true }).agents[1];
  const atPartnerAlarm = evaluateScenario(config, 15_250, "test", { running: true }).agents[1];
  assert.equal(beforeDirect.fear, 0);
  assert.equal(atDirect.fear, 0);
  assert.equal(beforePartnerAlarm.fear, 0);
  assert.equal(atPartnerAlarm.fear, 0);
  assert.equal(atDirect.expression, "alert");
  assert.equal(atPartnerAlarm.expression, "alert");
});

test("dialogue and threat cues are deterministic scene data", () => {
  const chat = evaluateScenario(config, 4_100, "test", { running: true });
  assert.equal(chat.audioCues[0]?.kind, "friendly");
  assert.equal(chat.audioCues[0]?.sourceId, "agent-e");
  assert.equal(chat.agents.find((agent) => agent.id === "agent-e")?.speaking, true);
  const threat = evaluateScenario(config, 12_300, "test", { running: true });
  assert.equal(threat.audioCues[0]?.kind, "pps-looming-bursts");
  assert.equal(threat.audioCues[0]?.sourceId, "threat");
  assert.equal(threat.audioCues[0]?.y, 1.55);
  assert.equal(threat.audioProtocol.id, "pps-separated-spatial-threat-cues-v1");
  const finalApproach = evaluateScenario(config, 35_000, "test", { running: true });
  assert.deepEqual(finalApproach.audioCues.map((cue) => cue.kind), ["pps-looming-bursts", "roughness"]);
  assert.equal(finalApproach.audioCues[1]?.durationMs, 3_000);
});

test("the shrouded threat begins hidden and fades in monotonically with approach", () => {
  const baseline = evaluateScenario(config, 4_000, "test", { running: true });
  const approachStart = evaluateScenario(config, 12_000, "test", { running: true });
  const midway = evaluateScenario(config, 25_000, "test", { running: true });
  const hold = evaluateScenario(config, 39_000, "test", { running: true });
  assert.equal(baseline.threat.distance, 16);
  assert.equal(baseline.threat.visibility, 0);
  assert.equal(approachStart.threat.visibility, 0);
  assert.ok(midway.threat.visibility > approachStart.threat.visibility);
  assert.ok(hold.threat.visibility > midway.threat.visibility);
  assert.equal(hold.threat.visibility, 1);

  const comparison = evaluateScenario({ ...config, threatKind: "angry-agent" }, 1_000, "test", { running: true });
  assert.equal(comparison.threat.visibility, 1);
});

test("spider threat fades in and carries the spider menace cue", () => {
  const early = evaluateScenario({ ...config, threatKind: "spider" }, 1_000, "test", { running: true });
  const approach = evaluateScenario({ ...config, threatKind: "spider" }, 35_000, "test", { running: true });
  assert.equal(early.threat.visibility, 0);
  assert.ok(approach.threat.visibility > 0);
  assert.equal(approach.audioCues.find((cue) => cue.kind === "spider-menace")?.sourceId, "threat");
  assert.equal(approach.audioCues.find((cue) => cue.sourceId === "threat")?.y, 0.42);
});

test("the approaching threat stays oriented toward the viewer", () => {
  for (const elapsed of [12_000, 25_000, 37_000]) {
    const state = evaluateScenario({ ...config, threatKind: "spider" }, elapsed, "test", { running: true });
    const forwardX = Math.sin(state.threat.yaw);
    const forwardZ = Math.cos(state.threat.yaw);
    const towardViewerX = -state.threat.x;
    const towardViewerZ = -state.threat.z;
    assert.ok(forwardX * towardViewerX + forwardZ * towardViewerZ > 0);
  }
});

test("the longer positive baseline sustains varied dyadic and group-like tone exchange", () => {
  const lateBaseline = evaluateScenario(config, 10_500, "test", { running: true });
  assert.equal(lateBaseline.phase, "baseline");
  assert.equal(lateBaseline.socialLinks.filter((link) => link.kind === "conversation").length, 6);
  assert.ok(lateBaseline.agents.every((agent) => agent.fear === 0 && agent.avoidance === 0));
  assert.equal(lateBaseline.audioCues[0]?.kind, "murmur");

  const cueKinds = [600, 1_700, 5_600, 6_400].flatMap((elapsed) =>
    evaluateScenario(config, elapsed, "test", { running: true }).audioCues.map((cue) => cue.kind));
  assert.ok(cueKinds.includes("friendly"));
  assert.ok(cueKinds.includes("acknowledge"));
  assert.ok(cueKinds.includes("murmur"));
});

test("the threat moves during awareness instead of waiting for an approach cut", () => {
  const start = evaluateScenario(config, 12_000, "test", { running: true });
  const early = evaluateScenario(config, 14_000, "test", { running: true });
  const later = evaluateScenario(config, 17_000, "test", { running: true });
  assert.equal(early.phase, "detected");
  assert.ok(start.threat.distance > early.threat.distance);
  assert.ok(early.threat.distance > later.threat.distance);
  assert.ok(early.threat.visibility > 0 && early.threat.visibility < later.threat.visibility);
});

test("awareness, fear, avoidance, and displacement ramp without an instant crowd switch", () => {
  const onset = evaluateScenario(config, 14_400, "test", { running: true }).agents[0];
  const early = evaluateScenario(config, 18_000, "test", { running: true }).agents[0];
  const middle = evaluateScenario(config, 27_000, "test", { running: true }).agents[0];
  const hold = evaluateScenario(config, 39_000, "test", { running: true }).agents[0];
  assert.equal(onset.awareness, 0);
  assert.equal(onset.fear, 0);
  assert.ok(early.awareness > onset.awareness && early.awareness < 1);
  assert.ok(early.fear > onset.fear && early.fear < middle.fear);
  assert.ok(early.avoidance < middle.avoidance && middle.avoidance < hold.avoidance);

  const displacement = (state: typeof early) => Math.hypot(state.x - onset.x, state.z - onset.z);
  assert.ok(displacement(early) < displacement(middle));
  assert.ok(displacement(middle) < displacement(hold));
});

test("locomotion follows actual displacement and settles at the hold", () => {
  const moving = evaluateScenario(config, 27_000, "test", { running: true });
  const held = evaluateScenario(config, 39_000, "test", { running: true });
  assert.ok(moving.agents.some((agent) => agent.locomotion > 0.15 && agent.avoidance > 0.25));
  assert.ok(held.agents.every((agent) => agent.locomotion < 0.02));
  assert.ok(held.agents.every((agent) => agent.behavior === "freeze"));
  const baselineWidth = evaluateScenario(config, 2_000, "test", { running: true }).agents
    .reduce((range, agent) => [Math.min(range[0], agent.x), Math.max(range[1], agent.x)], [Infinity, -Infinity]);
  const heldWidth = held.agents.reduce((range, agent) => [Math.min(range[0], agent.x), Math.max(range[1], agent.x)], [Infinity, -Infinity]);
  assert.ok(heldWidth[1] - heldWidth[0] > baselineWidth[1] - baselineWidth[0] + 1.5);
});
