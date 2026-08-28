import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BASE_FACE_EMOTIONS,
  FACE_PROTOTYPES,
  blendFaceEmotions,
  faceGeometryToSphereMeshData,
  faceGeometryToSphereSvg,
  faceGeometryToSvg,
  facePointToSphere,
  facePointToSphereUv,
  featureToSvgPath,
  interpolateFaceGeometry,
  morphFace,
  sampleSvgFeature,
  scenarioFaceGeometry,
} from "../lib/facial-expression.ts";

function flatten(geometry: (typeof FACE_PROTOTYPES)["neutral"]) {
  return Object.values(geometry).flatMap((feature) => [
    feature.start.x,
    feature.start.y,
    ...feature.segments.flatMap((segment) => [
      segment.control1.x,
      segment.control1.y,
      segment.control2.x,
      segment.control2.y,
      segment.to.x,
      segment.to.y,
    ]),
  ]);
}

function maximumDelta(left: number[], right: number[]) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

test("all seven facial end states share morph-compatible SVG topology", () => {
  const reference = FACE_PROTOTYPES.neutral;
  assert.deepEqual(BASE_FACE_EMOTIONS, ["neutral", "happiness", "sadness", "fear", "anger", "surprise", "disgust"]);
  for (const emotion of BASE_FACE_EMOTIONS) {
    const candidate = FACE_PROTOTYPES[emotion];
    assert.deepEqual(Object.keys(candidate), Object.keys(reference));
    for (const featureName of Object.keys(reference) as Array<keyof typeof reference>) {
      assert.equal(candidate[featureName].segments.length, reference[featureName].segments.length, `${emotion}:${featureName}`);
      assert.equal(candidate[featureName].closed, reference[featureName].closed, `${emotion}:${featureName}`);
      assert.match(featureToSvgPath(candidate[featureName]), /^M .* C /);
    }
    assert.ok(flatten(candidate).every(Number.isFinite), emotion);
  }
});

test("every facial end state can morph continuously to every other end state", () => {
  for (const from of BASE_FACE_EMOTIONS) {
    for (const to of BASE_FACE_EMOTIONS) {
      assert.deepEqual(morphFace({ from, to, progress: 0 }), FACE_PROTOTYPES[from]);
      assert.deepEqual(morphFace({ from, to, progress: 1 }), FACE_PROTOTYPES[to]);
      const midpoint = flatten(morphFace({ from, to, progress: 0.5 }));
      const left = flatten(FACE_PROTOTYPES[from]);
      const right = flatten(FACE_PROTOTYPES[to]);
      midpoint.forEach((value, index) => {
        assert.ok(value >= Math.min(left[index], right[index]) - 1e-12);
        assert.ok(value <= Math.max(left[index], right[index]) + 1e-12);
      });
    }
  }
});

test("weighted compound faces preserve one-hot end states and normalized geometry", () => {
  assert.deepEqual(blendFaceEmotions({ fear: 1 }), FACE_PROTOTYPES.fear);
  const mixed = blendFaceEmotions({ happiness: 2, surprise: 1, fear: 1 });
  const expected = interpolateFaceGeometry(
    interpolateFaceGeometry(FACE_PROTOTYPES.happiness, FACE_PROTOTYPES.surprise, 1 / 3, false),
    FACE_PROTOTYPES.fear,
    1 / 4,
    false,
  );
  assert.ok(maximumDelta(flatten(mixed), flatten(expected)) < 1e-12);
});

test("scenario transitions are continuous at calm-alert and alert-fear boundaries", () => {
  const calm = flatten(scenarioFaceGeometry("calm", 0));
  const alertStart = flatten(scenarioFaceGeometry("alert", 0));
  const alertEnd = flatten(scenarioFaceGeometry("alert", 0.46));
  const fearStart = flatten(scenarioFaceGeometry("afraid", 0.46));
  assert.equal(maximumDelta(calm, alertStart), 0);
  assert.equal(maximumDelta(alertEnd, fearStart), 0);
  assert.ok(maximumDelta(alertStart, alertEnd) > 0.05);
});

test("SVG export and spherical projection remain finite and front-facing", () => {
  const svg = faceGeometryToSvg(FACE_PROTOTYPES.anger, {
    title: "Anger & focus",
    description: 'A vector endpoint with <escaped> metadata.',
  });
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="-1 -1 2 2"/);
  assert.match(svg, /shape-rendering="geometricPrecision"/);
  assert.match(svg, /<title>Anger &amp; focus<\/title>/);
  assert.match(svg, /&lt;escaped&gt;/);
  assert.match(svg, /data-feature="mouth"/);
  assert.doesNotMatch(svg, /\s(?:width|height)="[0-9]/);
  assert.doesNotMatch(svg, /NaN|Infinity/);

  const sphericalSvg = faceGeometryToSphereSvg(FACE_PROTOTYPES.anger);
  assert.match(sphericalSvg, /viewBox="0 0 2 1"/);
  assert.match(sphericalSvg, /translate\(0\.5 0\.5\) scale\(0\.37 0\.31\)/);

  const center = facePointToSphere({ x: 0, y: 0 }, 0.34);
  assert.deepEqual(center, { x: 0, y: 0, z: 0.34 });
  const point = facePointToSphere({ x: 0.5, y: -0.5 }, 0.34);
  assert.ok(Math.abs(Math.hypot(point.x, point.y, point.z) - 0.34) < 1e-12);
  assert.ok(point.x > 0 && point.y > 0 && point.z > 0);

  assert.deepEqual(facePointToSphereUv({ x: 0, y: 0 }), { u: 0.25, v: 0.5 });
  const uv = facePointToSphereUv({ x: 0.5, y: -0.5 });
  assert.ok(uv.u > 0.25 && uv.u < 0.5);
  assert.ok(uv.v > 0.5 && uv.v < 1);
});

test("SVG curves tessellate into finite resolution-independent sphere meshes", () => {
  const topology = new Map<string, [number, number]>();
  for (const emotion of BASE_FACE_EMOTIONS) {
    const face = FACE_PROTOTYPES[emotion];
    assert.equal(sampleSvgFeature(face.leftBrow, 32).length, 33);
    assert.equal(sampleSvgFeature(face.leftEye, 32).length, 128);
    const mesh = faceGeometryToSphereMeshData(face, 0.344, undefined, 32);
    assert.equal(mesh.eyeFills.positions.length / 3, 256, `${emotion}:two SVG eye rings`);
    assert.equal(mesh.eyeFills.indices.length, 756, `${emotion}:triangulated eye fills`);
    assert.equal(mesh.darkFills.positions.length / 3, 384, `${emotion}:two pupils and one mouth ring`);
    assert.equal(mesh.darkFills.indices.length, 1134, `${emotion}:triangulated pupil and mouth fills`);
    for (const [name, layer] of [
      ["strokes", mesh.strokes],
      ["eyeFills", mesh.eyeFills],
      ["darkFills", mesh.darkFills],
    ] as const) {
      assert.ok(layer.positions.length > 0, `${emotion}:${name}:positions`);
      assert.equal(layer.positions.length % 3, 0, `${emotion}:${name}:position topology`);
      assert.equal(layer.indices.length % 3, 0, `${emotion}:${name}:triangle topology`);
      assert.ok(layer.positions.every(Number.isFinite), `${emotion}:${name}:finite positions`);
      assert.ok(layer.indices.every((index) => index >= 0 && index < layer.positions.length / 3), `${emotion}:${name}:bounded indices`);
      const signature: [number, number] = [layer.positions.length, layer.indices.length];
      if (!topology.has(name)) topology.set(name, signature);
      assert.deepEqual(signature, topology.get(name), `${emotion}:${name}:stable topology`);
    }
    for (let index = 0; index < mesh.strokes.positions.length; index += 3) {
      const radius = Math.hypot(
        mesh.strokes.positions[index],
        mesh.strokes.positions[index + 1],
        mesh.strokes.positions[index + 2],
      );
      assert.ok(Math.abs(radius - 0.344) < 1e-12, `${emotion}:stroke sphere radius`);
    }
  }
});

test("every pairwise SVG morph keeps valid sphere-mesh topology", () => {
  for (const from of BASE_FACE_EMOTIONS) {
    for (const to of BASE_FACE_EMOTIONS) {
      for (const progress of [0.25, 0.5, 0.75]) {
        const mesh = faceGeometryToSphereMeshData(morphFace({ from, to, progress }), 0.344, undefined, 32);
        assert.equal(mesh.eyeFills.indices.length, 756, `${from}->${to}@${progress}:eyes`);
        assert.equal(mesh.darkFills.indices.length, 1134, `${from}->${to}@${progress}:mouth/pupils`);
        assert.ok(mesh.strokes.positions.every(Number.isFinite), `${from}->${to}@${progress}:finite`);
      }
    }
  }
});

test("committed planar and spherical endpoint SVG assets match canonical geometry", () => {
  for (const emotion of BASE_FACE_EMOTIONS) {
    const label = emotion[0].toUpperCase() + emotion.slice(1);
    const description = `${label} project-authored facial-expression endpoint. Evidence-grounded prototype; not a normed or independently validated stimulus.`;
    const planar = readFileSync(path.resolve("public", "assets", "faces", "planar", `${emotion}.svg`), "utf8").trim();
    const spherical = readFileSync(path.resolve("public", "assets", "faces", "spherical", `${emotion}.svg`), "utf8").trim();
    assert.equal(planar, faceGeometryToSvg(FACE_PROTOTYPES[emotion], { title: `${label} facial expression`, description }));
    assert.equal(spherical, faceGeometryToSphereSvg(FACE_PROTOTYPES[emotion], undefined, { title: `${label} spherical facial map`, description }));
  }
});
