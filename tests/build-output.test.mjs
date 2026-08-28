import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("static export contains the study shell and local-only VDO.Ninja SDK", async () => {
  const html = await readFile(new URL("dist/client/index.html", root), "utf8");
  assert.match(html, /Social Threat Lab/);
  assert.match(html, /vendor\/vdoninja\/1\.5\.5\/vdoninja-sdk\.min\.js/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  await access(new URL("dist/client/.nojekyll", root));
});

test("vendored VDO.Ninja SDK 1.5.5 files retain the Affect Tracker hashes", async () => {
  const expected = new Map([
    ["vdoninja-sdk.min.js", "390ea6c8b1a4e57bf7fa18ff2b394f25cc79e637130f97e4a29ca958a90fac77"],
    ["vdoninja-sdk.js", "8097d5420d7ed2426623d7ff08f6abd45f03f89e6540a6cc4b86bcdc057d841e"],
    ["LICENSE-MPL-2.0.txt", "3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04"],
  ]);
  for (const [name, hash] of expected) {
    const bytes = await readFile(new URL(`public/vendor/vdoninja/1.5.5/${name}`, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, name);
  }
});

test("application source cannot request microphone or camera capture", async () => {
  const files = ["components/StudyApp.tsx", "components/ParticipantScene2D.tsx", "components/XrScene.tsx", "lib/scene-sync.ts", "lib/spatial-audio.ts"];
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /getUserMedia|mediaDevices|audio:\s*true|video:\s*true/);
  assert.match(source, /audio: false, video: false/);
});

test("phone layout uses safe areas, touch targets, dynamic viewport height, and scroll-safe canvases", async () => {
  const [css, xrScene] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /54dvh/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(xrScene, /\(pointer: coarse\)/);
  assert.match(xrScene, /coarsePointer \? "pan-y" : "none"/);
});

test("2D trial is primary and direct immersive entry uses the prewarmed lazy engine", async () => {
  const [studyApp, participantScene, css] = await Promise.all([
    readFile(new URL("components/StudyApp.tsx", root), "utf8"),
    readFile(new URL("components/ParticipantScene2D.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(studyApp, /type AppView = "landing" \| "trial" \| "companion"/);
  assert.match(studyApp, /view === "trial"/);
  assert.match(studyApp, /<ParticipantScene2D snapshot=\{scene\}/);
  assert.match(studyApp, /Start 2D/);
  assert.match(studyApp, /Start immersive 3D/);
  assert.match(studyApp, /onReady=\{handleXrReady\}/);
  assert.match(studyApp, /className=\{showXrPreview \? "mini-xr-preview" : "xr-prewarm"\}/);
  assert.match(studyApp, /shouldMountXr = showXrPreview \|\| xrSupport\.vr \|\| xrSupport\.ar/);
  assert.match(studyApp, /void startBroadcast\(\)/);
  assert.match(studyApp, /Host applied the command; live readback confirmed/);
  assert.doesNotMatch(studyApp, /contentReady|trial-ready/);
  assert.match(participantScene, /snapshot\.agents/);
  assert.match(participantScene, /drawThreat/);
  assert.match(participantScene, /agent\.expression === "afraid"/);
  assert.match(css, /\.participant-canvas/);
  assert.match(css, /\.trial-transport/);
});

test("immersive launch starts the clock and A remains a controller restart/resume action", async () => {
  const [studyApp, xrScene] = await Promise.all([
    readFile(new URL("components/StudyApp.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(xrScene, /source\.handedness === "right"/);
  assert.match(xrScene, /gamepad\?\.buttons\[4\]\?\.pressed/);
  assert.match(xrScene, /onStartRequest/);
  assert.match(studyApp, /onStartRequest=\{handleXrStart\}/);
  assert.match(studyApp, /await xrRef\.current\.enter\(mode\)/);
  assert.match(studyApp, /startScenario\("trial"\)/);
  assert.match(xrScene, /navigator\.xr\.requestSession/);
  assert.doesNotMatch(xrScene, /RingGeometry|informationTexture|marked limit/);
});

test("GitHub Pages assets are flattened to the project root when a prefix is configured", async () => {
  if (!process.env.PAGES_BASE_PATH) return;
  const prefixName = process.env.PAGES_BASE_PATH.replace(/^\//, "");
  await access(new URL("dist/client/_next", root));
  await assert.rejects(access(new URL(`dist/client/${prefixName}`, root)));
});

test("spatial threat audio uses HRTF looming, roughness, and bounded accelerating pulses", async () => {
  const audio = await readFile(new URL("lib/spatial-audio.ts", root), "utf8");
  assert.match(audio, /panningModel = "HRTF"/);
  assert.match(audio, /\[47, 0\.17\]/);
  assert.match(audio, /\[83, 0\.12\]/);
  assert.match(audio, /spider-menace/);
  assert.match(audio, /localTime \+= 1\.72 - progress \* 1\.16/);
  assert.match(audio, /distanceModel = "inverse"/);
  assert.match(audio, /makeFriendlyCue/);
  assert.match(audio, /\[5 \/ 4, 0\.27\]/);
  assert.match(audio, /\[3 \/ 2, 0\.18\]/);
});

test("external human and spider assets are pinned and shipped locally", async () => {
  const expected = new Map([
    ["cesium-man.glb", "b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9"],
    ["huntsman-spider.glb", "efc9cfda2b8a198277d6a1b10ca8123460d909deb76400ccddcb495d355bb5ca"],
  ]);
  for (const [name, hash] of expected) {
    const bytes = await readFile(new URL(`public/assets/models/${name}`, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, name);
    await access(new URL(`dist/client/assets/models/${name}`, root));
  }
});

test("participant renderers consume authoritative shadow visibility", async () => {
  const [scenario, participantScene, xrScene] = await Promise.all([
    readFile(new URL("lib/scenario.ts", root), "utf8"),
    readFile(new URL("components/ParticipantScene2D.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(scenario, /THREAT_START_Z = -16/);
  assert.match(scenario, /visibility: threatVisibility/);
  assert.match(participantScene, /globalAlpha = snapshot\.threat\.visibility/);
  assert.match(xrScene, /threatState\.visibility/);
});

test("first-read project memory and social preview are shipped", async () => {
  const [agents, memory, bibliography] = await Promise.all([
    readFile(new URL("AGENTS.md", root), "utf8"),
    readFile(new URL("FOR_AI/README.md", root), "utf8"),
    readFile(new URL("FOR_AI/documentation/BIBLIOGRAPHY.md", root), "utf8"),
  ]);
  assert.match(agents, /FOR_AI\/README\.md/);
  assert.match(memory, /Required reading order/);
  assert.match(bibliography, /10\.1038\/s41598-020-79767-0/);
  await access(new URL("public/og.png", root));
});
