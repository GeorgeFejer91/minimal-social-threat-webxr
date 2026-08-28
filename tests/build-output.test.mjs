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
  const files = ["components/StudyApp.tsx", "components/XrScene.tsx", "lib/scene-sync.ts"];
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /getUserMedia|mediaDevices|audio:\s*true|video:\s*true/);
  assert.match(source, /audio: false, video: false/);
});

test("phone layout uses safe areas, touch targets, dynamic viewport height, and scroll-safe WebGL", async () => {
  const [css, xrScene] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("components/XrScene.tsx", root), "utf8"),
  ]);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /52dvh/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(xrScene, /\(pointer: coarse\)/);
  assert.match(xrScene, /coarsePointer \? "pan-y" : "none"/);
});
