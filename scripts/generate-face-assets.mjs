import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE_FACE_EMOTIONS,
  FACE_PROTOTYPES,
  faceGeometryToSphereSvg,
  faceGeometryToSvg,
} from "../lib/facial-expression.ts";

const outputRoot = path.resolve(process.cwd(), "public", "assets", "faces");
const planarRoot = path.join(outputRoot, "planar");
const sphericalRoot = path.join(outputRoot, "spherical");

await Promise.all([
  mkdir(planarRoot, { recursive: true }),
  mkdir(sphericalRoot, { recursive: true }),
]);

const entries = [];
for (const emotion of BASE_FACE_EMOTIONS) {
  const label = emotion[0].toUpperCase() + emotion.slice(1);
  const description = `${label} project-authored facial-expression endpoint. Evidence-grounded prototype; not a normed or independently validated stimulus.`;
  const planarFile = `${emotion}.svg`;
  const sphericalFile = `${emotion}.svg`;
  await Promise.all([
    writeFile(
      path.join(planarRoot, planarFile),
      `${faceGeometryToSvg(FACE_PROTOTYPES[emotion], { title: `${label} facial expression`, description })}\n`,
      "utf8",
    ),
    writeFile(
      path.join(sphericalRoot, sphericalFile),
      `${faceGeometryToSphereSvg(FACE_PROTOTYPES[emotion], undefined, { title: `${label} spherical facial map`, description })}\n`,
      "utf8",
    ),
  ]);
  entries.push({
    id: emotion,
    planar: `planar/${planarFile}`,
    spherical: `spherical/${sphericalFile}`,
  });
}

const manifest = {
  schemaVersion: 1,
  assetType: "project-authored-svg-facial-expression-library",
  canonicalSource: "lib/facial-expression.ts",
  license: "repository license",
  properties: {
    planarViewBox: "-1 -1 2 2",
    sphericalViewBox: "0 0 2 1",
    curveType: "cubic Bezier",
    rasterDependencies: false,
    morphCompatibleTopology: true,
  },
  validationBoundary: "Evidence-grounded prototype. Exact endpoints, morphs, and spherical presentation require target-population validation.",
  emotions: entries,
};

await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
