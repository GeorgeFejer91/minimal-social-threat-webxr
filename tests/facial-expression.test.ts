import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_FACE_EMOTIONS,
  FACE_PROTOTYPES,
  blendFaceEmotions,
  faceGeometryToSvg,
  facePointToSphere,
  facePointToSphereUv,
  featureToSvgPath,
  interpolateFaceGeometry,
  morphFace,
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
  const svg = faceGeometryToSvg(FACE_PROTOTYPES.anger);
  assert.match(svg, /^<svg /);
  assert.match(svg, /data-feature="mouth"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);

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
