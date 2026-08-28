import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario, scenarioDurationMs, type ScenarioConfig } from "../lib/scenario.ts";

const config: ScenarioConfig = { threatKind: "shadow", intensity: "standard", mode: "virtual", loop: false };

test("scenario follows the documented phase sequence", () => {
  assert.equal(evaluateScenario(config, 0, "test", { running: false }).phase, "ready");
  assert.equal(evaluateScenario(config, 1_000, "test", { running: true }).phase, "baseline");
  assert.equal(evaluateScenario(config, 8_500, "test", { running: true }).phase, "detected");
  assert.equal(evaluateScenario(config, 12_000, "test", { running: true }).phase, "approach");
  assert.equal(evaluateScenario(config, 24_000, "test", { running: true }).phase, "hold");
  assert.equal(evaluateScenario(config, 27_000, "test", { running: true }).phase, "complete");
});

test("threat never crosses the 1.8 metre safety radius", () => {
  for (let elapsed = 0; elapsed <= 40_000; elapsed += 25) {
    const state = evaluateScenario(config, elapsed, "test", { running: true });
    assert.ok(state.threat.distance >= state.minimumThreatDistance - 1e-9, `${elapsed} ms`);
  }
});

test("agents visibly avoid the threat after detection", () => {
  const baseline = evaluateScenario(config, 2_000, "test", { running: true });
  const hold = evaluateScenario(config, 24_000, "test", { running: true });
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
  const gentle = evaluateScenario({ ...config, intensity: "gentle" }, 24_000, "test", { running: true });
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
  const spreading = evaluateScenario(config, 9_200, "test", { running: true });
  const detected = spreading.agents.filter((agent) => agent.detectedThreat).length;
  assert.ok(detected > 0 && detected < spreading.agents.length);
  assert.ok(new Set(spreading.agents.map((agent) => agent.behavior)).size >= 2);
  assert.ok(spreading.socialLinks.some((link) => link.kind === "alarm"));
});

test("dialogue and threat cues are deterministic scene data", () => {
  const chat = evaluateScenario(config, 3_200, "test", { running: true });
  assert.equal(chat.audioCues[0]?.kind, "friendly");
  assert.equal(chat.audioCues[0]?.sourceId, "agent-e");
  assert.equal(chat.agents.find((agent) => agent.id === "agent-e")?.speaking, true);
  const threat = evaluateScenario(config, 12_300, "test", { running: true });
  assert.equal(threat.audioCues[0]?.kind, "roughness");
  assert.equal(threat.audioCues[0]?.sourceId, "threat");
});

test("the shrouded threat begins hidden and fades in monotonically with approach", () => {
  const baseline = evaluateScenario(config, 4_000, "test", { running: true });
  const approachStart = evaluateScenario(config, 11_000, "test", { running: true });
  const midway = evaluateScenario(config, 17_000, "test", { running: true });
  const hold = evaluateScenario(config, 24_000, "test", { running: true });
  assert.equal(baseline.threat.distance, 16);
  assert.equal(baseline.threat.visibility, 0);
  assert.equal(approachStart.threat.visibility, 0);
  assert.ok(midway.threat.visibility > approachStart.threat.visibility);
  assert.ok(hold.threat.visibility > midway.threat.visibility);
  assert.equal(hold.threat.visibility, 1);

  const comparison = evaluateScenario({ ...config, threatKind: "angry-agent" }, 1_000, "test", { running: true });
  assert.equal(comparison.threat.visibility, 1);
});
