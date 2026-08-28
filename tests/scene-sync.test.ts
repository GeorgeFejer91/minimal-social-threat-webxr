import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario } from "../lib/scenario.ts";
import {
  decodeSceneCommand,
  decodeSceneFrame,
  encodeSceneFrame,
  isNewerSequence,
  SceneReceiver,
  type HostRuntimeReadback,
  type SceneCommand,
} from "../lib/scene-sync.ts";

const snapshot = evaluateScenario(
  { threatKind: "shadow", agentStyle: "minimal", intensity: "gentle", mode: "passthrough", loop: false },
  9_250,
  "session_test",
  { running: true, lastCommandId: "cmd_ok" },
);

const host: HostRuntimeReadback = {
  version: 1,
  revision: 27,
  pageVisibility: "visible",
  role: "headset",
  xr: {
    supportChecked: true,
    vrSupported: true,
    arSupported: true,
    engineReady: true,
    phase: "active",
    activeMode: "virtual",
    requestedMode: "passthrough",
    pendingRequestId: "cmd_request_xr",
    frameCount: 1_337,
  },
  receipts: [
    { requestId: "cmd_request_xr", action: "request-xr", status: "pending", message: "Confirm in the headset." },
    { requestId: "cmd_pause", action: "pause", status: "confirmed", reason: "applied" },
  ],
};

function frameWith(hostValue: unknown, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ version: 2, type: "scene", sequence: 42, snapshot, host: hostValue, ...extra });
}

test("v2 scene frames round-trip schema-v5 state and strict headset readback", () => {
  const frame = decodeSceneFrame(encodeSceneFrame(42, snapshot, host));
  assert.equal(frame?.version, 2);
  assert.equal(frame?.sequence, 42);
  assert.equal(frame?.snapshot.schemaVersion, 5);
  assert.equal(frame?.snapshot.audioProtocol.id, "pps-separated-spatial-threat-cues-v1");
  assert.equal(frame?.snapshot.sessionId, "session_test");
  assert.equal(frame?.snapshot.lastCommandId, "cmd_ok");
  assert.equal(frame?.snapshot.agents.length, 12);
  assert.deepEqual(frame?.host, host);
  assert.notStrictEqual(frame?.host, host);
  assert.notStrictEqual(frame?.host.xr, host.xr);
  assert.notStrictEqual(frame?.host.receipts, host.receipts);
});

test("frame decoder rejects oversized, malformed, wrong-version, and expanded envelopes", () => {
  assert.equal(decodeSceneFrame("{"), undefined);
  assert.equal(decodeSceneFrame("x".repeat(32_001)), undefined);
  assert.equal(decodeSceneFrame(JSON.stringify({ version: 1, type: "scene", sequence: 1, snapshot, host })), undefined);
  assert.equal(decodeSceneFrame(JSON.stringify({ version: 2, type: "scene", sequence: -1, snapshot, host })), undefined);
  assert.equal(decodeSceneFrame(JSON.stringify({ version: 2, type: "scene", sequence: 0x1_0000_0000, snapshot, host })), undefined);
  assert.equal(decodeSceneFrame(frameWith(host, { unexpected: true })), undefined);
  assert.equal(decodeSceneFrame(JSON.stringify({
    version: 2,
    type: "scene",
    sequence: 42,
    snapshot: { ...snapshot, audioProtocol: { ...snapshot.audioProtocol, bundledRecording: true } },
    host,
  })), undefined);
});

test("frame decoder strictly validates every host XR field", () => {
  const invalidHosts = [
    { ...host, version: 2 },
    { ...host, revision: -1 },
    { ...host, revision: 1.5 },
    { ...host, pageVisibility: "prerender" },
    { ...host, role: "companion" },
    { ...host, unexpected: true },
    { ...host, xr: { ...host.xr, supportChecked: "yes" } },
    { ...host, xr: { ...host.xr, vrSupported: 1 } },
    { ...host, xr: { ...host.xr, arSupported: null } },
    { ...host, xr: { ...host.xr, engineReady: "ready" } },
    { ...host, xr: { ...host.xr, phase: "starting" } },
    { ...host, xr: { ...host.xr, activeMode: "immersive-vr" } },
    { ...host, xr: { ...host.xr, requestedMode: "ar" } },
    { ...host, xr: { ...host.xr, pendingRequestId: "" } },
    { ...host, xr: { ...host.xr, pendingRequestId: "x".repeat(81) } },
    { ...host, xr: { ...host.xr, frameCount: -1 } },
    { ...host, xr: { ...host.xr, frameCount: 1.25 } },
    { ...host, xr: { ...host.xr, unexpected: true } },
  ];
  for (const invalidHost of invalidHosts) assert.equal(decodeSceneFrame(frameWith(invalidHost)), undefined);
});

test("host readback accepts at most sixteen bounded, exact receipts", () => {
  const sixteen = Array.from({ length: 16 }, (_, index) => ({
    requestId: `cmd_${index}`,
    action: "start" as const,
    status: "confirmed" as const,
  }));
  assert.equal(decodeSceneFrame(frameWith({ ...host, receipts: sixteen }))?.host.receipts.length, 16);
  assert.equal(decodeSceneFrame(frameWith({ ...host, receipts: [...sixteen, sixteen[0]] })), undefined);

  const malformedReceipts = [
    [{ requestId: "", action: "start", status: "confirmed" }],
    [{ requestId: " ", action: "start", status: "confirmed" }],
    [{ requestId: "x".repeat(81), action: "start", status: "confirmed" }],
    [{ requestId: "cmd_1", action: "run-script", status: "confirmed" }],
    [{ requestId: "cmd_1", action: "start", status: "applied" }],
    [{ requestId: "cmd_1", action: "start", status: "confirmed", reason: "x".repeat(161) }],
    [{ requestId: "cmd_1", action: "start", status: "confirmed", message: "x".repeat(501) }],
    [{ requestId: "cmd_1", action: "start", status: "confirmed", unexpected: true }],
  ];
  for (const receipts of malformedReceipts) {
    assert.equal(decodeSceneFrame(frameWith({ ...host, receipts })), undefined);
  }
});

test("all v2 command variants decode into fresh normalized objects", () => {
  const commands: SceneCommand[] = [
    { version: 2, type: "command", requestId: "cmd_start", action: "start" },
    { version: 2, type: "command", requestId: "cmd_pause", action: "pause" },
    { version: 2, type: "command", requestId: "cmd_resume", action: "resume" },
    { version: 2, type: "command", requestId: "cmd_reset", action: "reset" },
    { version: 2, type: "command", requestId: "cmd_exit", action: "exit-xr" },
    { version: 2, type: "command", requestId: "cmd_threat", action: "set-threat", value: "spider" },
    { version: 2, type: "command", requestId: "cmd_agents", action: "set-agent-style", value: "human" },
    { version: 2, type: "command", requestId: "cmd_intensity", action: "set-intensity", value: "standard" },
    { version: 2, type: "command", requestId: "cmd_mode", action: "set-mode", value: "passthrough" },
    { version: 2, type: "command", requestId: "cmd_loop", action: "set-loop", value: true },
    { version: 2, type: "command", requestId: "cmd_xr", action: "request-xr", value: "virtual" },
  ];
  for (const command of commands) {
    const decoded = decodeSceneCommand(JSON.stringify(command));
    assert.deepEqual(decoded, command);
    assert.notStrictEqual(decoded, command);
  }
});

test("command decoder rejects wrong values, versions, ids, and unexpected properties", () => {
  const invalidCommands = [
    { version: 1, type: "command", requestId: "cmd_1", action: "pause" },
    { version: 3, type: "command", requestId: "cmd_1", action: "pause" },
    { version: 2, type: "event", requestId: "cmd_1", action: "pause" },
    { version: 2, type: "command", requestId: "", action: "pause" },
    { version: 2, type: "command", requestId: " ", action: "pause" },
    { version: 2, type: "command", requestId: "x".repeat(81), action: "pause" },
    { version: 2, type: "command", requestId: "cmd_1", action: "run-script", value: "alert(1)" },
    { version: 2, type: "command", requestId: "cmd_1", action: "pause", value: true },
    { version: 2, type: "command", requestId: "cmd_1", action: "pause", unexpected: true },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-threat" },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-threat", value: "dragon" },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-agent-style", value: "robot" },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-intensity", value: "extreme" },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-mode", value: "immersive-vr" },
    { version: 2, type: "command", requestId: "cmd_1", action: "set-loop", value: 1 },
    { version: 2, type: "command", requestId: "cmd_1", action: "request-xr", value: "immersive-ar" },
    { version: 2, type: "command", requestId: "cmd_1", action: "request-xr", value: "virtual", unexpected: true },
  ];
  for (const command of invalidCommands) {
    assert.equal(decodeSceneCommand(JSON.stringify(command)), undefined);
  }
  assert.equal(decodeSceneCommand("{"), undefined);
  assert.equal(decodeSceneCommand("x".repeat(1_001)), undefined);
});

test("sequence comparison handles rollover and rejects duplicates", () => {
  assert.equal(isNewerSequence(10), true);
  assert.equal(isNewerSequence(10, 10), false);
  assert.equal(isNewerSequence(9, 10), false);
  assert.equal(isNewerSequence(0, 0xffffffff), true);
});

test("command retries stay bound to the selected source channel", async () => {
  const receiver = new SceneReceiver();
  const firstMessages: string[] = [];
  const secondMessages: string[] = [];
  const firstChannel = { readyState: "open", send: (value: string) => { firstMessages.push(value); } } as unknown as NonNullable<SceneReceiver["channel"]>;
  const secondChannel = { readyState: "open", send: (value: string) => { secondMessages.push(value); } } as unknown as NonNullable<SceneReceiver["channel"]>;
  receiver.selectedStreamId = "mst_bridge_v2_first";
  receiver.channel = firstChannel;
  assert.match(receiver.send({ action: "start" }), /^cmd_/);
  receiver.selectedStreamId = "mst_bridge_v2_second";
  receiver.channel = secondChannel;
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(firstMessages.length, 1);
  assert.equal(secondMessages.length, 0);
  await receiver.stop();
});

test("a departed selected source is cleared so replacement discovery can resume", async () => {
  const receiver = new SceneReceiver();
  receiver.sources.set("mst_bridge_v2_first", { streamId: "mst_bridge_v2_first", uuid: "peer_first", label: "Scene FIRST" });
  receiver.sources.set("mst_bridge_v2_second", { streamId: "mst_bridge_v2_second", uuid: "peer_second", label: "Scene SECOND" });
  receiver.selectedStreamId = "mst_bridge_v2_first";
  receiver.selectedUuid = "peer_first";
  receiver.channel = { readyState: "open" } as unknown as NonNullable<SceneReceiver["channel"]>;
  receiver.removeSource("peer_first");
  assert.equal(receiver.selectedStreamId, "");
  assert.equal(receiver.selectedUuid, "");
  assert.equal(receiver.channel, undefined);
  assert.equal(receiver.phase, "discovering");
  assert.deepEqual([...receiver.sources.keys()], ["mst_bridge_v2_second"]);
  assert.notEqual(receiver.discoveryTimer, undefined);
  await receiver.stop();
});

test("a closed selected channel is cleared without disturbing a replacement channel", async () => {
  const receiver = new SceneReceiver();
  const firstChannel = { readyState: "closed" } as unknown as NonNullable<SceneReceiver["channel"]>;
  const replacementChannel = { readyState: "open" } as unknown as NonNullable<SceneReceiver["channel"]>;
  receiver.sources.set("mst_bridge_v2_first", { streamId: "mst_bridge_v2_first", uuid: "peer_first", label: "Scene FIRST" });
  receiver.sources.set("mst_bridge_v2_second", { streamId: "mst_bridge_v2_second", uuid: "peer_second", label: "Scene SECOND" });
  receiver.selectedStreamId = "mst_bridge_v2_first";
  receiver.selectedUuid = "peer_first";
  receiver.channel = firstChannel;
  receiver.handleSelectedChannelClose("mst_bridge_v2_first", firstChannel);
  assert.equal(receiver.selectedStreamId, "");
  assert.equal(receiver.phase, "discovering");
  assert.deepEqual([...receiver.sources.keys()], ["mst_bridge_v2_second"]);

  receiver.selectedStreamId = "mst_bridge_v2_second";
  receiver.channel = replacementChannel;
  receiver.handleSelectedChannelClose("mst_bridge_v2_first", firstChannel);
  assert.equal(receiver.selectedStreamId, "mst_bridge_v2_second");
  assert.equal(receiver.channel, replacementChannel);
  await receiver.stop();
});
