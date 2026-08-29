import assert from "node:assert/strict";
import test from "node:test";
import { spiderMotionPose } from "../lib/spider-motion.ts";

test("spider gait exposes eight articulated legs in four bilateral pairs", () => {
  const pose = spiderMotionPose(15_000, "approach", "standard");
  assert.equal(pose.legs.length, 8);
  for (const pair of [0, 1, 2, 3]) {
    assert.equal(pose.legs.filter((leg) => leg.pair === pair).length, 2);
  }
});

test("spider gait alternates tetrapod support groups", () => {
  const pose = spiderMotionPose(23_000, "approach", "standard");
  const lifted = pose.legs.filter((leg) => leg.lift > 0.9);
  const planted = pose.legs.filter((leg) => leg.lift < 0.01);
  assert.equal(lifted.length, 4);
  assert.equal(planted.length, 4);
  const liftedGroups = new Set(lifted.map((leg) => (leg.pair + (leg.side === 1 ? 0 : 1)) % 2));
  const plantedGroups = new Set(planted.map((leg) => (leg.pair + (leg.side === 1 ? 0 : 1)) % 2));
  assert.equal(liftedGroups.size, 1);
  assert.equal(plantedGroups.size, 1);
  assert.notEqual([...liftedGroups][0], [...plantedGroups][0]);
});

test("spider stays planted while hidden and walks deterministically during approach", () => {
  const hidden = spiderMotionPose(9_000, "baseline", "standard");
  assert.ok(hidden.legs.every((leg) => leg.lift === 0));
  assert.equal(hidden.bodyBob, 0);

  const emerging = spiderMotionPose(14_000, "detected", "gentle");
  assert.ok(emerging.legs.some((leg) => leg.lift > 0));

  const first = spiderMotionPose(26_240, "approach", "gentle");
  const repeated = spiderMotionPose(26_240, "approach", "gentle");
  assert.deepEqual(first, repeated);
  assert.ok(first.legs.some((leg) => leg.lift > 0));
  assert.ok(first.bodyBob > 0);

  const held = spiderMotionPose(49_000, "hold", "gentle");
  assert.ok(held.legs.every((leg) => leg.lift === 0));
  assert.equal(held.bodyBob, 0);
});
