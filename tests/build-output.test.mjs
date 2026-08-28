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
  assert.match(studyApp, /detail\.latest\?\.host\.receipts\.find/);
  assert.match(studyApp, /value === "headset"/);
  assert.match(studyApp, /if \(!headsetHost\) return;.*startBroadcast/s);
  assert.doesNotMatch(studyApp, /contentReady|trial-ready/);
  assert.match(participantScene, /snapshot\.agents/);
  assert.match(participantScene, /drawThreat/);
  assert.match(participantScene, /agent\.expression === "afraid"/);
  assert.match(css, /\.participant-canvas/);
  assert.match(css, /\.trial-transport/);
});

test("immersive launch uses XR frames, layers, local confirmation, and controller actions", async () => {
  const [studyApp, xrScene] = await Promise.all([
    readFile(new URL("components/StudyApp.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(xrScene, /source\.handedness === "right"/);
  assert.match(xrScene, /gamepad\?\.buttons\[4\]\?\.pressed/);
  assert.match(xrScene, /onStartRequest/);
  assert.match(studyApp, /onStartRequest=\{handleXrStart\}/);
  assert.match(studyApp, /onFrame=\{advanceScenarioFrame\}/);
  assert.match(studyApp, /if \(!xrActiveRef\.current\) advanceScenarioFrame\(now\)/);
  assert.match(xrScene, /if \(renderer\.xr\.isPresenting\) frameRef\.current\(time\)/);
  assert.match(studyApp, /await xrRef\.current\.enter\(mode\)/);
  assert.match(xrScene, /navigator\.xr\.requestSession/);
  assert.match(xrScene, /optionalFeatures: mode === "passthrough" \? \["layers", "dom-overlay"\] : \["layers"\]/);
  assert.match(studyApp, /Local headset confirmation required/);
  assert.match(studyApp, /pendingXrRequest\.requestId/);
  assert.match(studyApp, /xrPhase === "awaiting-local-confirmation"/);
  assert.match(studyApp, /xrPhaseRef\.current !== "awaiting-local-confirmation"/);
  assert.match(xrScene, /applyMode\(previousMode\)/);
  assert.doesNotMatch(xrScene, /RingGeometry|informationTexture|marked limit/);
});

test("v2 companion bridge exposes full controls, runtime readback, and a 3D state viewport", async () => {
  const [studyApp, sceneSync] = await Promise.all([
    readFile(new URL("components/StudyApp.tsx", root), "utf8"),
    readFile(new URL("lib/scene-sync.ts", root), "utf8"),
  ]);
  assert.match(sceneSync, /version: 2/);
  assert.match(sceneSync, /HostRuntimeReadback/);
  for (const action of ["set-agent-style", "set-mode", "set-loop", "request-xr", "exit-xr"]) {
    assert.match(sceneSync, new RegExp(`"${action}"`));
    assert.match(studyApp, new RegExp(`action: "${action}"`));
  }
  assert.match(studyApp, /Authoritative scene-state viewport/);
  assert.match(studyApp, /Not headset video or pose/);
  assert.match(studyApp, /remoteHost\?\.xr\.frameCount/);
  assert.match(studyApp, /local-confirmation-required/);
});

test("GitHub Pages assets are flattened to the project root when a prefix is configured", async () => {
  if (!process.env.PAGES_BASE_PATH) return;
  const prefixName = process.env.PAGES_BASE_PATH.replace(/^\//, "");
  await access(new URL("dist/client/_next", root));
  await assert.rejects(access(new URL(`dist/client/${prefixName}`, root)));
});

test("spatial threat audio separates PPS localization, 70 Hz roughness, and controlled distance rendering", async () => {
  const [audio, protocol] = await Promise.all([
    readFile(new URL("lib/spatial-audio.ts", root), "utf8"),
    readFile(new URL("lib/threat-audio-protocol.ts", root), "utf8"),
  ]);
  assert.match(audio, /panningModel = "HRTF"/);
  assert.match(audio, /makePpsBurstTrain/);
  assert.match(audio, /makeRoughThreat/);
  assert.match(audio, /propagationDelaySeconds/);
  assert.match(audio, /rolloffFactor = isThreat \? 0/);
  assert.match(protocol, /modulationHz: 70/);
  assert.match(protocol, /burstDurationS: 0\.03/);
  assert.match(protocol, /targetPeriodS: 0\.095/);
  assert.match(protocol, /startRelativeDb: -18/);
  assert.match(protocol, /spiderM: 0\.42/);
  assert.match(protocol, /sourceHeightPolicyId/);
  assert.match(protocol, /calibrationStatus: "relative-digital-level-only; no dB SPL claim"/);
  assert.match(audio, /makeFriendlyCue/);
  assert.match(audio, /\[5 \/ 4, 0\.27\]/);
  assert.match(audio, /\[3 \/ 2, 0\.18\]/);
});

test("immersive audio is off by default and requires deliberate pre-entry opt-in", async () => {
  const study = await readFile(new URL("components/StudyApp.tsx", root), "utf8");
  assert.match(study, /const \[audioEnabled, setAudioEnabled\] = useState\(false\)/);
  assert.match(study, /const silenceSpatialAudio = useCallback\([\s\S]*?audioEngine\.dispose\(\)[\s\S]*?setAudioEnabled\(false\)/);
  assert.match(study, /if \(!audioEnabled\) return;[\s\S]*?if \(!xrActive\) audioEngine\.setListenerPose[\s\S]*?audioEngine\.update\(scene\)/);
  assert.match(study, /audioEngine=\{audioEnabled \? audioEngine : undefined\}/);
  assert.doesNotMatch(study, /const enterImmersive = useCallback[\s\S]*?silenceSpatialAudio\(\)[\s\S]*?await xrRef\.current\.enter\(mode\)/);
  assert.match(study, /Audio never starts automatically or from a remote command/);
});

test("external human and retained spider reference assets are pinned and shipped locally", async () => {
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

test("spider renderers use the viewer-facing articulated gait rather than the static GLB", async () => {
  const [motion, scenario, participantScene, xrScene] = await Promise.all([
    readFile(new URL("lib/spider-motion.ts", root), "utf8"),
    readFile(new URL("lib/scenario.ts", root), "utf8"),
    readFile(new URL("components/ParticipantScene2D.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(motion, /alternating-tetrapod gait/);
  assert.match(scenario, /yaw: yawToward\(threatX, threatZ, 0, 0\)/);
  assert.match(participantScene, /spiderMotionPose/);
  assert.match(xrScene, /viewer-facing-animated-spider/);
  assert.match(xrScene, /spiderMotionPose/);
  assert.match(xrScene, /threat\.rotation\.y = threatState\.yaw/);
  assert.doesNotMatch(xrScene, /huntsman-spider\.glb/);
  assert.doesNotMatch(xrScene, /spiderTwitch/);
});

test("both participant renderers consume the corridor-cleared procedural forest", async () => {
  const [forest, participantScene, xrScene] = await Promise.all([
    readFile(new URL("lib/forest-layout.ts", root), "utf8"),
    readFile(new URL("components/ParticipantScene2D.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(forest, /THREAT_CORRIDOR_HALF_WIDTH = 2\.4/);
  assert.match(forest, /forestTreeCorridorClearance/);
  assert.match(participantScene, /FOREST_TREES/);
  assert.match(participantScene, /drawForestTree2D/);
  assert.match(xrScene, /corridor-cleared-forest/);
  assert.match(xrScene, /makeForestTree/);
  assert.match(xrScene, /new THREE\.FogExp2/);
  assert.doesNotMatch(xrScene, /Math\.sin\(angle\) \* radius/);
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

test("facial expressions ship as SVG and render as vector meshes on the procedural head sphere", async () => {
  const [faces, participantScene, xrScene] = await Promise.all([
    readFile(new URL("lib/facial-expression.ts", root), "utf8"),
    readFile(new URL("components/ParticipantScene2D.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(faces, /BASE_FACE_EMOTIONS/);
  assert.match(faces, /interpolateFaceGeometry/);
  assert.match(faces, /blendFaceEmotions/);
  assert.match(faces, /featureToSvgPath/);
  assert.match(faces, /faceGeometryToSphereSvg/);
  assert.match(faces, /faceGeometryToSphereMeshData/);
  assert.match(faces, /u:\s*0\.25/);
  assert.match(participantScene, /scenarioFaceGeometry/);
  assert.match(xrScene, /faceGeometryToSphereMeshData/);
  assert.match(xrScene, /new THREE\.BufferGeometry\(\)/);
  assert.match(xrScene, /isVectorFace/);
  assert.doesNotMatch(xrScene, /drawFaceOnSphereTexture/);
  assert.doesNotMatch(xrScene, /new THREE\.PlaneGeometry\(0\.58, 0\.58\)/);
  await access(new URL("public/assets/faces/manifest.json", root));
  await access(new URL("public/assets/faces/planar/fear.svg", root));
  await access(new URL("public/assets/faces/spherical/fear.svg", root));
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
