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
  const files = ["components/StudyApp.tsx", "components/TopdownScene.tsx", "components/XrScene.tsx", "lib/scene-sync.ts", "lib/spatial-audio.ts"];
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

test("main trial viewport switches between live top-down and 3D renderers", async () => {
  const [studyApp, topdownScene, xrScene, css] = await Promise.all([
    readFile(new URL("components/StudyApp.tsx", root), "utf8"),
    readFile(new URL("components/TopdownScene.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(studyApp, /type AppView = "landing" \| "trial" \| "companion"/);
  assert.match(studyApp, /view === "trial"/);
  assert.match(studyApp, /const \[previewMode, setPreviewMode\] = useState<"topdown" \| "3d">\("topdown"\)/);
  assert.match(studyApp, /previewMode === "topdown" && <TopdownScene snapshot=\{scene\} fill/);
  assert.match(studyApp, /previewMode === "3d" \? "browser-xr-view" : "xr-prewarm"/);
  assert.match(studyApp, /visible=\{previewMode === "3d"\}/);
  assert.match(studyApp, /aria-pressed=\{previewMode === "topdown"\}[\s\S]*?Top-down/);
  assert.match(studyApp, /aria-pressed=\{previewMode === "3d"\}[\s\S]*?3D view/);
  assert.match(studyApp, /Start preview/);
  assert.match(studyApp, /Start immersive 3D/);
  assert.match(studyApp, /onReady=\{handleXrReady\}/);
  assert.match(studyApp, /shouldMountXr = previewMode === "3d" \|\| xrSupport\.vr \|\| xrSupport\.ar/);
  assert.match(studyApp, /void startBroadcast\(\)/);
  assert.match(studyApp, /detail\.latest\?\.host\.receipts\.find/);
  assert.match(studyApp, /value === "headset"/);
  assert.match(studyApp, /if \(!headsetHost\) return;.*startBroadcast/s);
  assert.doesNotMatch(studyApp, /contentReady|trial-ready/);
  assert.match(topdownScene, /snapshot\.agents/);
  assert.match(topdownScene, /snapshot\.threat/);
  assert.match(topdownScene, /topdown-canvas-fill/);
  assert.doesNotMatch(studyApp, /ParticipantScene2D/);
  assert.match(css, /\.topdown-canvas-fill/);
  assert.match(css, /\.browser-xr-view/);
  assert.match(css, /\.scene-view-switch/);
  assert.match(css, /\.trial-transport/);
  assert.match(xrScene, /if \(!visible\) return;[\s\S]*?renderer\.setSize\(rect\.width, rect\.height, false\);[\s\S]*?\}, \[visible\]\)/);
});

test("gradual threat pressure drives authoritative displacement and motion-scaled animation", async () => {
  const [scenario, sceneSync, xrScene, audio] = await Promise.all([
    readFile(new URL("lib/scenario.ts", root), "utf8"),
    readFile(new URL("lib/scene-sync.ts", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
    readFile(new URL("lib/spatial-audio.ts", root), "utf8"),
  ]);
  assert.match(scenario, /SCENE_SCHEMA_VERSION = 6/);
  assert.match(scenario, /baselineEndSeconds: 12/);
  assert.match(scenario, /standardApproachEndSeconds: 38/);
  assert.match(scenario, /gentleApproachEndSeconds: 48/);
  assert.match(scenario, /threatApproachAt/);
  assert.match(scenario, /awareness/);
  assert.match(scenario, /avoidance/);
  assert.match(scenario, /locomotion/);
  assert.match(sceneSync, /agent\.locomotion < 0 \|\| agent\.locomotion > 1/);
  assert.match(xrScene, /motionEnergy = THREE\.MathUtils\.clamp\(agentState\.locomotion/);
  assert.match(xrScene, /gaitWave \* 0\.62 \* motionEnergy/);
  assert.match(audio, /const contour = cue\.kind === "murmur"/);
  assert.match(audio, /phraseGain\.gain/);
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
  assert.match(studyApp, /const sessionReady = xrRef\.current\.enter\(mode\)/);
  assert.match(studyApp, /await sessionReady/);
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
  assert.match(audio, /cue\.kind === "friendly" \|\| cue\.kind === "murmur" \|\| cue\.kind === "acknowledge"/);
  assert.match(audio, /\[5 \/ 4, 0\.27\]/);
  assert.match(audio, /\[3 \/ 2, 0\.18\]/);
});

test("immersive entry automatically owns spatial audio without a separate setting", async () => {
  const study = await readFile(new URL("components/StudyApp.tsx", root), "utf8");
  assert.match(study, /const \[audioEnabled, setAudioEnabled\] = useState\(false\)/);
  assert.match(study, /const sessionReady = xrRef\.current\.enter\(mode\);[\s\S]*?const audioReady = audioEngine\.enable\(\)/);
  assert.match(study, /await sessionReady;[\s\S]*?await audioReady;[\s\S]*?setAudioEnabled\(audio\.enabled\)/);
  assert.match(study, /void audioEngine\.dispose\(\);[\s\S]*?setAudioEnabled\(false\);[\s\S]*?xrPhaseRef\.current = "inline"/);
  assert.match(study, /audioEngine=\{audioEnabled \? audioEngine : undefined\}/);
  assert.doesNotMatch(study, /Enable spatial audio|Disable spatial audio|toggleSpatialAudio/);
  assert.match(study, /automatic spatial threat audio/);
});

test("a locally started browser preview runs the complete cue schedule without an audio setting", async () => {
  const study = await readFile(new URL("components/StudyApp.tsx", root), "utf8");
  assert.match(study, /const startPreview = useCallback\([\s\S]*?audioEngine\.enable\(\)[\s\S]*?setAudioEnabled\(true\)[\s\S]*?audioEngine\.update\(sceneRef\.current\)/);
  assert.match(study, /Start preview runs the selected top-down or 3D viewport with the complete generated scene-audio schedule/);
  assert.doesNotMatch(study, /Enable spatial audio|Disable spatial audio|toggleSpatialAudio/);
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

test("the 3D participant renderer uses the viewer-facing articulated gait rather than the static GLB", async () => {
  const [motion, scenario, xrScene] = await Promise.all([
    readFile(new URL("lib/spider-motion.ts", root), "utf8"),
    readFile(new URL("lib/scenario.ts", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(motion, /alternating-tetrapod gait/);
  assert.match(scenario, /yaw: yawToward\(threatX, threatZ, 0, 0\)/);
  assert.match(xrScene, /viewer-facing-animated-spider/);
  assert.match(xrScene, /spiderMotionPose/);
  assert.match(xrScene, /threat\.rotation\.y = threatState\.yaw/);
  assert.doesNotMatch(xrScene, /huntsman-spider\.glb/);
  assert.doesNotMatch(xrScene, /spiderTwitch/);
});

test("the 3D participant renderer consumes the corridor-cleared procedural forest", async () => {
  const [forest, xrScene] = await Promise.all([
    readFile(new URL("lib/forest-layout.ts", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(forest, /THREAT_CORRIDOR_HALF_WIDTH = 2\.4/);
  assert.match(forest, /forestTreeCorridorClearance/);
  assert.match(xrScene, /corridor-cleared-forest/);
  assert.match(xrScene, /makeForestTree/);
  assert.match(xrScene, /new THREE\.FogExp2/);
  assert.doesNotMatch(xrScene, /Math\.sin\(angle\) \* radius/);
});

test("planar and 3D views consume authoritative shadow visibility", async () => {
  const [scenario, topdownScene, xrScene] = await Promise.all([
    readFile(new URL("lib/scenario.ts", root), "utf8"),
    readFile(new URL("components/TopdownScene.tsx", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(scenario, /THREAT_START_Z = -16/);
  assert.match(scenario, /visibility: threatVisibility/);
  assert.match(topdownScene, /snapshot\.threat\.visibility/);
  assert.match(xrScene, /threatState\.visibility/);
});

test("facial expressions ship as SVG and render as vector meshes on the procedural head sphere", async () => {
  const [faces, xrScene] = await Promise.all([
    readFile(new URL("lib/facial-expression.ts", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(faces, /BASE_FACE_EMOTIONS/);
  assert.match(faces, /interpolateFaceGeometry/);
  assert.match(faces, /blendFaceEmotions/);
  assert.match(faces, /featureToSvgPath/);
  assert.match(faces, /faceGeometryToSphereSvg/);
  assert.match(faces, /faceGeometryToSphereMeshData/);
  assert.match(faces, /u:\s*0\.25/);
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
  assert.match(memory, /GitHub Pages is the sole deployment target/);
  assert.match(bibliography, /10\.1038\/s41598-020-79767-0/);
  await assert.rejects(access(new URL(".openai/hosting.json", root)));
  await access(new URL("public/og.png", root));
});
