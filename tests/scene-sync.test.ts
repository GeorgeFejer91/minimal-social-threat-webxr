import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario } from "../lib/scenario.ts";
import { decodeSceneCommand, decodeSceneFrame, encodeSceneFrame, isNewerSequence } from "../lib/scene-sync.ts";

const snapshot = evaluateScenario(
  { threatKind: "shadow", intensity: "gentle", mode: "passthrough", loop: false },
  9_250,
  "session_test",
  { running: true, lastCommandId: "cmd_ok" },
);

test("scene frames round-trip with a version and headset readback", () => {
  const frame = decodeSceneFrame(encodeSceneFrame(42, snapshot));
  assert.equal(frame?.sequence, 42);
  assert.equal(frame?.snapshot.sessionId, "session_test");
  assert.equal(frame?.snapshot.lastCommandId, "cmd_ok");
  assert.equal(frame?.snapshot.agents.length, 6);
});

test("decoder rejects oversized, malformed, and wrong-version frames", () => {
  assert.equal(decodeSceneFrame("{"), undefined);
  assert.equal(decodeSceneFrame("x".repeat(32_001)), undefined);
  assert.equal(decodeSceneFrame(JSON.stringify({ version: 2, type: "scene", sequence: 1, snapshot })), undefined);
});

test("remote commands are a small explicit allowlist", () => {
  assert.deepEqual(decodeSceneCommand(JSON.stringify({ version: 1, type: "command", requestId: "cmd_1", action: "pause" })), {
    version: 1, type: "command", requestId: "cmd_1", action: "pause",
  });
  assert.equal(decodeSceneCommand(JSON.stringify({ version: 1, type: "command", requestId: "cmd_2", action: "run-script", value: "alert(1)" })), undefined);
  assert.equal(decodeSceneCommand(JSON.stringify({ version: 1, type: "command", requestId: "cmd_3", action: "set-threat", value: "dragon" })), undefined);
});

test("sequence comparison handles rollover and rejects duplicates", () => {
  assert.equal(isNewerSequence(10), true);
  assert.equal(isNewerSequence(10, 10), false);
  assert.equal(isNewerSequence(9, 10), false);
  assert.equal(isNewerSequence(0, 0xffffffff), true);
});
