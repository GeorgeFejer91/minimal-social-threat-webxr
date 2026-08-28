export const BASE_FACE_EMOTIONS = [
  "neutral",
  "happiness",
  "sadness",
  "fear",
  "anger",
  "surprise",
  "disgust",
] as const;

export type BaseFaceEmotion = (typeof BASE_FACE_EMOTIONS)[number];
export type ScenarioExpression = "calm" | "alert" | "afraid" | "angry";

export interface FacePoint {
  x: number;
  y: number;
}

export interface CubicSegment {
  control1: FacePoint;
  control2: FacePoint;
  to: FacePoint;
}

export interface SvgFeaturePath {
  start: FacePoint;
  segments: readonly CubicSegment[];
  closed: boolean;
}

export type FaceFeatureName =
  | "leftBrow"
  | "rightBrow"
  | "leftEye"
  | "rightEye"
  | "leftPupil"
  | "rightPupil"
  | "nose"
  | "mouth";

export type FaceGeometry = Record<FaceFeatureName, SvgFeaturePath>;

export interface FaceMorph {
  from: BaseFaceEmotion;
  to: BaseFaceEmotion;
  progress: number;
}

export interface SphereFaceProjection {
  horizontalArc: number;
  verticalArc: number;
}

export const DEFAULT_SPHERE_FACE_PROJECTION: Readonly<SphereFaceProjection> = Object.freeze({
  horizontalArc: Math.PI * 0.37,
  verticalArc: Math.PI * 0.31,
});

const FEATURE_NAMES: readonly FaceFeatureName[] = [
  "leftBrow",
  "rightBrow",
  "leftEye",
  "rightEye",
  "leftPupil",
  "rightPupil",
  "nose",
  "mouth",
];

const KAPPA = 0.5522847498307936;

function point(x: number, y: number): FacePoint {
  return { x, y };
}

function segment(
  control1X: number,
  control1Y: number,
  control2X: number,
  control2Y: number,
  toX: number,
  toY: number,
): CubicSegment {
  return {
    control1: point(control1X, control1Y),
    control2: point(control2X, control2Y),
    to: point(toX, toY),
  };
}

function brow(startX: number, startY: number, endX: number, endY: number, archY: number): SvgFeaturePath {
  const width = endX - startX;
  return {
    start: point(startX, startY),
    segments: [segment(startX + width * 0.3, archY, startX + width * 0.7, archY, endX, endY)],
    closed: false,
  };
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0): SvgFeaturePath {
  const rotate = (x: number, y: number) => {
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    return point(cx + x * cosine - y * sine, cy + x * sine + y * cosine);
  };
  const left = rotate(-rx, 0);
  const top = rotate(0, -ry);
  const right = rotate(rx, 0);
  const bottom = rotate(0, ry);
  const leftTop1 = rotate(-rx, -ry * KAPPA);
  const leftTop2 = rotate(-rx * KAPPA, -ry);
  const rightTop1 = rotate(rx * KAPPA, -ry);
  const rightTop2 = rotate(rx, -ry * KAPPA);
  const rightBottom1 = rotate(rx, ry * KAPPA);
  const rightBottom2 = rotate(rx * KAPPA, ry);
  const leftBottom1 = rotate(-rx * KAPPA, ry);
  const leftBottom2 = rotate(-rx, ry * KAPPA);
  return {
    start: left,
    segments: [
      { control1: leftTop1, control2: leftTop2, to: top },
      { control1: rightTop1, control2: rightTop2, to: right },
      { control1: rightBottom1, control2: rightBottom2, to: bottom },
      { control1: leftBottom1, control2: leftBottom2, to: left },
    ],
    closed: true,
  };
}

function nose(
  startX: number,
  startY: number,
  middleX: number,
  middleY: number,
  endX: number,
  endY: number,
  bend = 0.07,
): SvgFeaturePath {
  return {
    start: point(startX, startY),
    segments: [
      segment(startX - bend, startY + 0.06, middleX - bend, middleY - 0.04, middleX, middleY),
      segment(middleX + bend, middleY + 0.02, endX + bend, endY - 0.02, endX, endY),
    ],
    closed: false,
  };
}

function mouth(
  leftX: number,
  leftY: number,
  topY: number,
  rightX: number,
  rightY: number,
  bottomY: number,
  topX = 0,
  bottomX = 0,
): SvgFeaturePath {
  const topWidth = (topX - leftX) * 0.56;
  const rightTopWidth = (rightX - topX) * 0.44;
  const bottomWidth = (bottomX - rightX) * 0.56;
  const leftBottomWidth = (leftX - bottomX) * 0.44;
  return {
    start: point(leftX, leftY),
    segments: [
      segment(leftX + topWidth, leftY, topX - rightTopWidth, topY, topX, topY),
      segment(topX + rightTopWidth, topY, rightX - topWidth, rightY, rightX, rightY),
      segment(rightX + bottomWidth, rightY, bottomX - leftBottomWidth, bottomY, bottomX, bottomY),
      segment(bottomX + leftBottomWidth, bottomY, leftX - bottomWidth, leftY, leftX, leftY),
    ],
    closed: true,
  };
}

function face(overrides: Partial<FaceGeometry>): FaceGeometry {
  const neutral = {
    leftBrow: brow(-0.68, -0.49, -0.14, -0.49, -0.53),
    rightBrow: brow(0.14, -0.49, 0.68, -0.49, -0.53),
    leftEye: ellipse(-0.39, -0.23, 0.2, 0.11),
    rightEye: ellipse(0.39, -0.23, 0.2, 0.11),
    leftPupil: ellipse(-0.39, -0.22, 0.052, 0.065),
    rightPupil: ellipse(0.39, -0.22, 0.052, 0.065),
    nose: nose(0, -0.08, -0.055, 0.11, 0.065, 0.19),
    mouth: mouth(-0.34, 0.38, 0.35, 0.34, 0.38, 0.42),
  } satisfies FaceGeometry;
  return { ...neutral, ...overrides };
}

// These prototypes are compact geometric approximations of recurring FACS
// configurations. They are evidence-grounded design targets, not normed stimuli.
export const FACE_PROTOTYPES: Readonly<Record<BaseFaceEmotion, FaceGeometry>> = Object.freeze({
  neutral: face({}),
  // AU 6/12/25: narrowed eyes, raised lip corners, parted lips.
  happiness: face({
    leftEye: ellipse(-0.39, -0.2, 0.21, 0.068, -0.04),
    rightEye: ellipse(0.39, -0.2, 0.21, 0.068, 0.04),
    leftPupil: ellipse(-0.39, -0.195, 0.046, 0.045),
    rightPupil: ellipse(0.39, -0.195, 0.046, 0.045),
    mouth: mouth(-0.47, 0.3, 0.39, 0.47, 0.3, 0.55),
  }),
  // AU 1/4/15/17: raised inner brows and depressed lip corners.
  sadness: face({
    leftBrow: brow(-0.68, -0.44, -0.14, -0.59, -0.61),
    rightBrow: brow(0.14, -0.59, 0.68, -0.44, -0.61),
    leftEye: ellipse(-0.39, -0.21, 0.2, 0.105, -0.06),
    rightEye: ellipse(0.39, -0.21, 0.2, 0.105, 0.06),
    mouth: mouth(-0.4, 0.52, 0.36, 0.4, 0.52, 0.45),
  }),
  // AU 1/2/4/5/20/25: tense raised brows, wide eyes, stretched open mouth.
  fear: face({
    leftBrow: brow(-0.69, -0.59, -0.12, -0.63, -0.7),
    rightBrow: brow(0.12, -0.63, 0.69, -0.59, -0.7),
    leftEye: ellipse(-0.39, -0.2, 0.21, 0.19),
    rightEye: ellipse(0.39, -0.2, 0.21, 0.19),
    leftPupil: ellipse(-0.39, -0.18, 0.05, 0.075),
    rightPupil: ellipse(0.39, -0.18, 0.05, 0.075),
    nose: nose(0, -0.06, -0.045, 0.12, 0.055, 0.2),
    mouth: mouth(-0.46, 0.42, 0.28, 0.46, 0.42, 0.6),
  }),
  // AU 4/7/24: lowered converging brows, tightened lids, pressed lips.
  anger: face({
    leftBrow: brow(-0.7, -0.54, -0.12, -0.32, -0.5),
    rightBrow: brow(0.12, -0.32, 0.7, -0.54, -0.5),
    leftEye: ellipse(-0.39, -0.19, 0.21, 0.075, 0.08),
    rightEye: ellipse(0.39, -0.19, 0.21, 0.075, -0.08),
    leftPupil: ellipse(-0.36, -0.18, 0.05, 0.045),
    rightPupil: ellipse(0.36, -0.18, 0.05, 0.045),
    mouth: mouth(-0.4, 0.48, 0.4, 0.4, 0.48, 0.51),
  }),
  // AU 1/2/5/25/26: raised brows, wide eyes, rounded open mouth.
  surprise: face({
    leftBrow: brow(-0.68, -0.65, -0.14, -0.66, -0.72),
    rightBrow: brow(0.14, -0.66, 0.68, -0.65, -0.72),
    leftEye: ellipse(-0.39, -0.2, 0.21, 0.205),
    rightEye: ellipse(0.39, -0.2, 0.21, 0.205),
    leftPupil: ellipse(-0.39, -0.18, 0.052, 0.072),
    rightPupil: ellipse(0.39, -0.18, 0.052, 0.072),
    mouth: mouth(-0.23, 0.45, 0.2, 0.23, 0.45, 0.7),
  }),
  // AU 9/10/17: nose wrinkle, raised upper lip, lower-face emphasis.
  disgust: face({
    leftBrow: brow(-0.68, -0.46, -0.14, -0.38, -0.49),
    rightBrow: brow(0.14, -0.38, 0.68, -0.46, -0.49),
    leftEye: ellipse(-0.39, -0.18, 0.2, 0.072, 0.04),
    rightEye: ellipse(0.39, -0.18, 0.2, 0.072, -0.04),
    leftPupil: ellipse(-0.39, -0.175, 0.045, 0.042),
    rightPupil: ellipse(0.39, -0.175, 0.045, 0.042),
    nose: nose(-0.03, -0.08, -0.13, 0.12, 0.1, 0.17, 0.13),
    mouth: mouth(-0.42, 0.49, 0.28, 0.42, 0.36, 0.55, -0.07, 0.08),
  }),
});

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function smoothMorphProgress(value: number) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function mixPoint(from: FacePoint, to: FacePoint, progress: number): FacePoint {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function interpolatePath(from: SvgFeaturePath, to: SvgFeaturePath, progress: number): SvgFeaturePath {
  if (from.segments.length !== to.segments.length || from.closed !== to.closed) {
    throw new Error("Facial SVG paths must share topology before they can be morphed.");
  }
  return {
    start: mixPoint(from.start, to.start, progress),
    segments: from.segments.map((fromSegment, index) => {
      const toSegment = to.segments[index];
      return {
        control1: mixPoint(fromSegment.control1, toSegment.control1, progress),
        control2: mixPoint(fromSegment.control2, toSegment.control2, progress),
        to: mixPoint(fromSegment.to, toSegment.to, progress),
      };
    }),
    closed: from.closed,
  };
}

export function interpolateFaceGeometry(
  from: FaceGeometry,
  to: FaceGeometry,
  progress: number,
  eased = true,
): FaceGeometry {
  const amount = eased ? smoothMorphProgress(progress) : clamp01(progress);
  if (amount === 0) return from;
  if (amount === 1) return to;
  return Object.fromEntries(FEATURE_NAMES.map((name) => [
    name,
    interpolatePath(from[name], to[name], amount),
  ])) as FaceGeometry;
}

export function morphFace({ from, to, progress }: FaceMorph): FaceGeometry {
  return interpolateFaceGeometry(FACE_PROTOTYPES[from], FACE_PROTOTYPES[to], progress);
}

export function blendFaceEmotions(weights: Partial<Record<BaseFaceEmotion, number>>): FaceGeometry {
  const active = BASE_FACE_EMOTIONS
    .map((emotion) => ({ emotion, weight: Math.max(0, weights[emotion] ?? 0) }))
    .filter((item) => item.weight > 0);
  const total = active.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return FACE_PROTOTYPES.neutral;
  let accumulatedWeight = active[0].weight;
  let result = FACE_PROTOTYPES[active[0].emotion];
  for (const item of active.slice(1)) {
    const nextWeight = accumulatedWeight + item.weight;
    result = interpolateFaceGeometry(result, FACE_PROTOTYPES[item.emotion], item.weight / nextWeight, false);
    accumulatedWeight = nextWeight;
  }
  return result;
}

const CALM_FACE = interpolateFaceGeometry(FACE_PROTOTYPES.neutral, FACE_PROTOTYPES.happiness, 0.68);

export function scenarioFaceGeometry(expression: ScenarioExpression, fear: number): FaceGeometry {
  if (expression === "calm") return CALM_FACE;
  if (expression === "alert") {
    return interpolateFaceGeometry(CALM_FACE, FACE_PROTOTYPES.surprise, clamp01(fear / 0.46));
  }
  if (expression === "afraid") {
    return interpolateFaceGeometry(FACE_PROTOTYPES.surprise, FACE_PROTOTYPES.fear, clamp01((fear - 0.46) / 0.54));
  }
  return FACE_PROTOTYPES.anger;
}

function formatNumber(value: number) {
  return Number(value.toFixed(4)).toString();
}

export function featureToSvgPath(feature: SvgFeaturePath) {
  const segments = feature.segments.map((item) => (
    `C ${formatNumber(item.control1.x)} ${formatNumber(item.control1.y)} ${formatNumber(item.control2.x)} ${formatNumber(item.control2.y)} ${formatNumber(item.to.x)} ${formatNumber(item.to.y)}`
  ));
  return `M ${formatNumber(feature.start.x)} ${formatNumber(feature.start.y)} ${segments.join(" ")}${feature.closed ? " Z" : ""}`;
}

export function faceGeometryToSvg(geometry: FaceGeometry, stroke = "#17231e") {
  const paths = FEATURE_NAMES.map((name) => {
    const fill = name === "mouth" || name.endsWith("Pupil") ? stroke : name.endsWith("Eye") ? "#effff7" : "none";
    return `<path data-feature="${name}" d="${featureToSvgPath(geometry[name])}" fill="${fill}" stroke="${stroke}" />`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2"><g stroke-width="0.055" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

export function drawFaceGeometry(
  context: CanvasRenderingContext2D,
  geometry: FaceGeometry,
  centerX: number,
  centerY: number,
  scaleX: number,
  scaleY = scaleX,
  stroke = "#17231e",
) {
  context.save();
  context.translate(centerX, centerY);
  context.scale(scaleX, scaleY);
  context.lineWidth = 0.055;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke;

  for (const name of FEATURE_NAMES) {
    const path = new Path2D(featureToSvgPath(geometry[name]));
    if (name === "mouth" || name.endsWith("Pupil")) {
      context.fillStyle = stroke;
      context.fill(path);
    } else if (name.endsWith("Eye")) {
      context.fillStyle = "rgba(239, 255, 247, .88)";
      context.fill(path);
      context.stroke(path);
    } else {
      context.stroke(path);
    }
  }
  context.restore();
}

export function facePointToSphereUv(
  value: FacePoint,
  projection: SphereFaceProjection = DEFAULT_SPHERE_FACE_PROJECTION,
) {
  return {
    // Three.js SphereGeometry places local +Z at u=0.25. Keeping the facial
    // center there preserves the same forward axis as the former +Z plane.
    u: 0.25 + (value.x * projection.horizontalArc) / (Math.PI * 2),
    v: 0.5 - (value.y * projection.verticalArc) / Math.PI,
  };
}

export function facePointToSphere(
  value: FacePoint,
  radius = 1,
  projection: SphereFaceProjection = DEFAULT_SPHERE_FACE_PROJECTION,
) {
  const longitude = value.x * projection.horizontalArc;
  const latitude = -value.y * projection.verticalArc;
  const latitudeRadius = Math.cos(latitude) * radius;
  const vertical = Math.sin(latitude) * radius;
  return {
    x: Math.sin(longitude) * latitudeRadius,
    y: Object.is(vertical, -0) ? 0 : vertical,
    z: Math.cos(longitude) * latitudeRadius,
  };
}

export function drawFaceOnSphereTexture(
  context: CanvasRenderingContext2D,
  geometry: FaceGeometry,
  width: number,
  height: number,
  projection: SphereFaceProjection = DEFAULT_SPHERE_FACE_PROJECTION,
  stroke = "#17231e",
) {
  const horizontalScale = (width * projection.horizontalArc) / (Math.PI * 2);
  const verticalScale = (height * projection.verticalArc) / Math.PI;
  drawFaceGeometry(context, geometry, width * 0.25, height * 0.5, horizontalScale, verticalScale, stroke);
}
