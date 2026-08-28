import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario, scenarioDurationMs, type ScenarioConfig } from "../lib/scenario.ts";

const config: ScenarioConfig = { threatKind: "tiger", intensity: "standard", mode: "virtual", loop: false };

test("scenario follows the documented phase sequence", () => {
  assert.equal(evaluateScenario(config, 0, "test", { running: false }).phase, "ready");
  assert.equal(evaluateScenario(config, 1_000, "test", { running: true }).phase, "baseline");
  assert.equal(evaluateScenario(config, 5_000, "test", { running: true }).phase, "detected");
  assert.equal(evaluateScenario(config, 10_000, "test", { running: true }).phase, "approach");
  assert.equal(evaluateScenario(config, 20_000, "test", { running: true }).phase, "hold");
  assert.equal(evaluateScenario(config, 23_000, "test", { running: true }).phase, "complete");
});

test("threat never crosses the 1.8 metre safety radius", () => {
  for (let elapsed = 0; elapsed <= 40_000; elapsed += 25) {
    const state = evaluateScenario(config, elapsed, "test", { running: true });
    assert.ok(state.threat.distance >= state.minimumThreatDistance - 1e-9, `${elapsed} ms`);
  }
});

test("agents visibly avoid the threat after detection", () => {
  const baseline = evaluateScenario(config, 2_000, "test", { running: true });
  const hold = evaluateScenario(config, 20_000, "test", { running: true });
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
  const gentle = evaluateScenario({ ...config, intensity: "gentle" }, 19_000, "test", { running: true });
  assert.equal(gentle.phase, "approach");
});
