"use client";

import { useEffect, useRef } from "react";
import { drawFaceGeometry, scenarioFaceGeometry } from "../lib/facial-expression";
import { FOREST_TREES, type ForestTree } from "../lib/forest-layout";
import type { AgentState, Expression, SceneSnapshot } from "../lib/scenario";
import { spiderMotionPose } from "../lib/spider-motion";

interface ParticipantScene2DProps {
  snapshot: SceneSnapshot;
}

const AGENT_COLORS = ["#69c2a2", "#7fb7d1", "#c394d1", "#e0ad72", "#85c48b", "#dc8791"];

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

const BROADLEAF_COLORS = [
  ["#153f34", "#20513e", "#2e6549"],
  ["#194638", "#285b43", "#397052"],
  ["#1d4d39", "#306348", "#427858"],
] as const;

const PINE_COLORS = [
  ["#0f3932", "#17483b", "#245b47"],
  ["#123f35", "#1c5040", "#2b644b"],
  ["#17463a", "#235844", "#347052"],
] as const;

function drawForestTree2D(
  context: CanvasRenderingContext2D,
  tree: ForestTree,
  x: number,
  groundY: number,
  height: number,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, groundY);

  const trunkWidth = height * (tree.species === "pine" ? 0.075 : 0.105);
  const trunkHeight = height * (tree.species === "pine" ? 0.78 : 0.66);
  const trunkGradient = context.createLinearGradient(-trunkWidth, 0, trunkWidth, 0);
  trunkGradient.addColorStop(0, "#2b211c");
  trunkGradient.addColorStop(0.5, "#604a38");
  trunkGradient.addColorStop(1, "#34271f");
  context.fillStyle = trunkGradient;
  context.beginPath();
  context.moveTo(-trunkWidth * 0.68, -trunkHeight);
  context.lineTo(trunkWidth * 0.65, -trunkHeight);
  context.lineTo(trunkWidth, 0);
  context.lineTo(-trunkWidth, 0);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(104, 78, 58, .82)";
  context.lineCap = "round";
  context.lineWidth = Math.max(1, trunkWidth * 0.38);
  for (const [side, branchY, reach] of [[-1, -0.53, 0.3], [1, -0.44, 0.27], [-1, -0.35, 0.22]] as const) {
    context.beginPath();
    context.moveTo(0, trunkHeight * branchY);
    context.lineTo(side * height * reach, trunkHeight * (branchY - 0.25));
    context.stroke();
  }

  if (tree.species === "pine") {
    const colors = PINE_COLORS[tree.tone];
    for (let tier = 0; tier < 4; tier += 1) {
      const tierY = -height * (0.25 + tier * 0.18);
      const halfWidth = height * (0.39 - tier * 0.065);
      const tierHeight = height * 0.34;
      context.fillStyle = colors[tier % colors.length];
      context.beginPath();
      context.moveTo(0, tierY - tierHeight);
      context.bezierCurveTo(-halfWidth * 0.22, tierY - tierHeight * 0.5, -halfWidth * 0.7, tierY - tierHeight * 0.1, -halfWidth, tierY);
      context.quadraticCurveTo(-halfWidth * 0.35, tierY - tierHeight * 0.08, 0, tierY + tierHeight * 0.05);
      context.quadraticCurveTo(halfWidth * 0.35, tierY - tierHeight * 0.08, halfWidth, tierY);
      context.bezierCurveTo(halfWidth * 0.7, tierY - tierHeight * 0.1, halfWidth * 0.22, tierY - tierHeight * 0.5, 0, tierY - tierHeight);
      context.fill();
    }
  } else {
    const colors = BROADLEAF_COLORS[tree.tone];
    const clusters = [
      [-0.28, -0.68, 0.34, 0.27],
      [0.25, -0.7, 0.36, 0.29],
      [-0.03, -0.89, 0.38, 0.31],
      [-0.39, -0.49, 0.3, 0.24],
      [0.39, -0.51, 0.31, 0.25],
      [0.02, -0.52, 0.42, 0.3],
    ] as const;
    for (let index = 0; index < clusters.length; index += 1) {
      const [offsetX, offsetY, radiusX, radiusY] = clusters[index];
      context.fillStyle = colors[index % colors.length];
      context.beginPath();
      context.ellipse(offsetX * height, offsetY * height, radiusX * height, radiusY * height, index * 0.18, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "rgba(124, 159, 94, .18)";
    context.beginPath();
    context.ellipse(-height * 0.14, -height * 0.82, height * 0.2, height * 0.11, -0.45, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(8, 22, 17, .42)";
  context.beginPath();
  context.ellipse(0, height * 0.02, height * 0.25, height * 0.055, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFace(context: CanvasRenderingContext2D, x: number, y: number, size: number, expression: Expression, fear = 1) {
  drawFaceGeometry(context, scenarioFaceGeometry(expression, fear), x, y, size * 0.52);
}

function drawAgent(
  context: CanvasRenderingContext2D,
  agent: AgentState,
  index: number,
  project: (x: number, z: number) => { x: number; y: number; scale: number },
  snapshot: SceneSnapshot,
) {
  const point = project(agent.x, agent.z);
  const size = 43 * point.scale;
  const color = AGENT_COLORS[index % AGENT_COLORS.length];

  context.fillStyle = "rgba(1, 13, 10, .26)";
  context.beginPath();
  context.ellipse(point.x, point.y + size * 0.84, size * 0.47, size * 0.13, 0, 0, Math.PI * 2);
  context.fill();

  if (snapshot.config.agentStyle === "human") {
    const skin = ["#bd8667", "#d7a281", "#8f5f49", "#e2b696"][index % 4];
    context.strokeStyle = color;
    context.lineWidth = size * 0.19;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(point.x - size * 0.14, point.y + size * 0.62);
    context.lineTo(point.x - size * 0.18, point.y + size * 1.02);
    context.moveTo(point.x + size * 0.14, point.y + size * 0.62);
    context.lineTo(point.x + size * 0.18, point.y + size * 1.02);
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(point.x - size * 0.34, point.y + size * 0.22);
    context.lineTo(point.x + size * 0.34, point.y + size * 0.22);
    context.lineTo(point.x + size * 0.25, point.y + size * 0.69);
    context.lineTo(point.x - size * 0.25, point.y + size * 0.69);
    context.closePath();
    context.fill();
    const skinGradient = context.createRadialGradient(
      point.x - size * 0.1,
      point.y - size * 0.16,
      size * 0.04,
      point.x,
      point.y,
      size * 0.44,
    );
    skinGradient.addColorStop(0, "#f3c8ad");
    skinGradient.addColorStop(0.55, skin);
    skinGradient.addColorStop(1, "#684437");
    context.fillStyle = skinGradient;
    context.beginPath();
    context.ellipse(point.x, point.y - size * 0.02, size * 0.31, size * 0.38, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#2b211d";
    context.beginPath();
    context.arc(point.x, point.y - size * 0.1, size * 0.31, Math.PI, Math.PI * 2);
    context.fill();
    drawFace(context, point.x, point.y, size * 0.72, agent.expression, agent.fear);
  } else {
    context.fillStyle = color;
    roundedRect(context, point.x - size * 0.4, point.y + size * 0.25, size * 0.8, size * 0.7, size * 0.28);
    const headGradient = context.createRadialGradient(
      point.x - size * 0.15,
      point.y - size * 0.17,
      size * 0.04,
      point.x,
      point.y,
      size * 0.54,
    );
    headGradient.addColorStop(0, "#b7ead8");
    headGradient.addColorStop(0.42, color);
    headGradient.addColorStop(1, "#245f51");
    context.fillStyle = headGradient;
    context.beginPath();
    context.arc(point.x, point.y, size * 0.46, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(239, 255, 248, .36)";
    context.lineWidth = Math.max(1, size * 0.035);
    context.stroke();
    drawFace(context, point.x, point.y, size, agent.expression, agent.fear);
  }

  if (agent.expression === "afraid") {
    const awayX = agent.x - snapshot.threat.x;
    const awayZ = agent.z - snapshot.threat.z;
    const length = Math.max(0.01, Math.hypot(awayX, awayZ));
    const cueX = (awayX / length) * size * 0.7;
    const cueY = (awayZ / length) * size * 0.32;
    context.strokeStyle = "rgba(255, 218, 144, .72)";
    context.lineWidth = Math.max(1.5, size * 0.04);
    for (let offset = 0; offset < 2; offset += 1) {
      context.beginPath();
      context.moveTo(point.x - cueX * (0.66 + offset * 0.22), point.y + size * 0.56 - cueY);
      context.lineTo(point.x - cueX * (1.06 + offset * 0.22), point.y + size * 0.56 - cueY * 1.4);
      context.stroke();
    }
  }

  const cue = snapshot.audioCues.find((item) => item.sourceId === agent.id);
  if (cue) {
    const label = cue.text.length > 24 ? `${cue.text.slice(0, 23)}…` : cue.text;
    context.font = `700 ${Math.max(8, size * 0.13)}px system-ui`;
    const width = Math.min(150 * point.scale, context.measureText(label).width + size * 0.32);
    context.fillStyle = "rgba(5, 21, 17, .9)";
    roundedRect(context, point.x - width / 2, point.y - size * 0.9, width, size * 0.28, size * 0.1);
    context.fillStyle = "#e9fff5";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, point.x, point.y - size * 0.76, width - 6);
  }
}

function drawThreat(
  context: CanvasRenderingContext2D,
  snapshot: SceneSnapshot,
  project: (x: number, z: number) => { x: number; y: number; scale: number },
) {
  const point = project(snapshot.threat.x, snapshot.threat.z);
  const size = 62 * point.scale;
  const shadow = snapshot.threat.kind === "shadow";

  if (shadow) {
    if (snapshot.threat.visibility <= 0.005) return;
    context.save();
    context.globalAlpha = snapshot.threat.visibility;
    const aura = context.createRadialGradient(point.x, point.y + size * 0.15, size * 0.15, point.x, point.y + size * 0.15, size * 1.15);
    aura.addColorStop(0, "rgba(4, 4, 8, .88)");
    aura.addColorStop(0.55, "rgba(5, 4, 10, .54)");
    aura.addColorStop(1, "rgba(3, 2, 8, 0)");
    context.fillStyle = aura;
    context.beginPath();
    context.ellipse(point.x, point.y + size * 0.12, size * 1.05, size * 1.35, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(6, 6, 11, .96)";
    context.beginPath();
    context.moveTo(point.x, point.y - size * 0.55);
    context.bezierCurveTo(point.x - size * 0.54, point.y - size * 0.18, point.x - size * 0.58, point.y + size * 0.62, point.x - size * 0.77, point.y + size * 0.98);
    context.bezierCurveTo(point.x - size * 0.24, point.y + size * 0.84, point.x + size * 0.22, point.y + size * 1.08, point.x + size * 0.75, point.y + size * 0.94);
    context.bezierCurveTo(point.x + size * 0.53, point.y + size * 0.54, point.x + size * 0.48, point.y - size * 0.16, point.x, point.y - size * 0.55);
    context.fill();
    context.fillStyle = "#030407";
    context.beginPath(); context.arc(point.x, point.y - size * 0.2, size * 0.36, 0, Math.PI * 2); context.fill();

    context.shadowColor = "#ff2c2c";
    context.shadowBlur = Math.max(5, size * 0.2);
    context.fillStyle = "#ff4b3e";
    context.beginPath(); context.ellipse(point.x - size * 0.13, point.y - size * 0.23, size * 0.055, size * 0.035, -0.12, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.ellipse(point.x + size * 0.13, point.y - size * 0.23, size * 0.055, size * 0.035, 0.12, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0;

    context.fillStyle = "rgba(5, 5, 9, .82)";
    roundedRect(context, point.x - size * 0.52, point.y - size * 0.9, size * 1.04, size * 0.24, size * 0.12);
    context.fillStyle = "#ffd3ce";
    context.font = `800 ${Math.max(8, size * 0.13)}px system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SHADOW", point.x, point.y - size * 0.78);
    context.restore();
    return;
  }

  if (snapshot.threat.kind === "spider") {
    if (snapshot.threat.visibility <= 0.005) return;
    context.save();
    context.globalAlpha = snapshot.threat.visibility;
    const motion = spiderMotionPose(snapshot.elapsedMs, snapshot.phase, snapshot.config.intensity);
    const bodyY = point.y + size * 0.47 - motion.bodyBob * size * 1.8;

    context.fillStyle = "rgba(13, 6, 4, .42)";
    context.beginPath();
    context.ellipse(point.x, bodyY + size * 0.37, size * 0.86, size * 0.14, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#1a100d";
    context.lineWidth = Math.max(2.5, size * 0.07);
    context.lineCap = "round";
    for (const leg of motion.legs) {
      const reach = size * (0.82 + Math.abs(leg.pair - 1.5) * 0.1);
      const attachmentX = point.x + leg.side * size * 0.18;
      const attachmentY = bodyY + leg.attachmentZ * size * 0.66;
      const kneeX = attachmentX + leg.side * reach * (0.53 - leg.lift * 0.045);
      const kneeY = attachmentY - Math.sin(leg.sweep) * reach * 0.3 - leg.lift * size * 0.1;
      const footX = attachmentX + leg.side * reach * (0.96 - leg.lift * 0.12);
      const footY = attachmentY - Math.sin(leg.sweep) * reach * 0.54 + leg.lift * size * 0.04;
      context.beginPath();
      context.moveTo(attachmentX, attachmentY);
      context.lineTo(kneeX, kneeY);
      context.lineTo(footX, footY);
      context.stroke();
      context.fillStyle = "#321b13";
      context.beginPath(); context.arc(kneeX, kneeY, Math.max(2, size * 0.045), 0, Math.PI * 2); context.fill();
    }

    context.fillStyle = "#241410";
    context.beginPath();
    context.ellipse(point.x, bodyY - size * 0.17, size * 0.43, size * 0.38, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(157, 86, 51, .52)";
    context.lineWidth = Math.max(1, size * 0.025);
    for (const offset of [-0.12, 0.03]) {
      context.beginPath();
      context.ellipse(point.x, bodyY + size * offset, size * 0.34, size * 0.08, 0, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = "#321a13";
    context.beginPath();
    context.ellipse(point.x, bodyY + size * 0.27, size * 0.31, size * 0.27, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(202, 141, 94, .38)";
    context.lineWidth = 1;
    for (let hair = -3; hair <= 3; hair += 1) {
      context.beginPath();
      context.moveTo(point.x + hair * size * 0.07, bodyY + size * 0.05);
      context.lineTo(point.x + hair * size * 0.1, bodyY - size * 0.32);
      context.stroke();
    }

    context.fillStyle = "#b4482a";
    for (const [eyeX, eyeY, radius] of [
      [-0.09, 0.36, 0.038], [0.09, 0.36, 0.038],
      [-0.19, 0.31, 0.027], [0.19, 0.31, 0.027],
      [-0.13, 0.43, 0.021], [0.13, 0.43, 0.021],
    ]) {
      context.beginPath();
      context.arc(point.x + size * eyeX, bodyY + size * eyeY, Math.max(1.2, size * radius), 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "#0c0605";
    context.lineWidth = Math.max(2, size * 0.055);
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(point.x + side * size * 0.09, bodyY + size * 0.42);
      context.lineTo(point.x + side * size * (0.12 + motion.mandible * 0.16), bodyY + size * 0.61);
      context.stroke();
    }

    context.fillStyle = "rgba(12, 6, 4, .86)";
    roundedRect(context, point.x - size * 0.52, point.y - size * 0.56, size * 1.04, size * 0.24, size * 0.12);
    context.fillStyle = "#ffd8c7";
    context.font = `800 ${Math.max(8, size * 0.13)}px system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SPIDER", point.x, point.y - size * 0.44);
    context.restore();
    return;
  }

  context.fillStyle = "rgba(25, 7, 4, .34)";
  context.beginPath();
  context.ellipse(point.x, point.y + size * 0.83, size * 0.53, size * 0.14, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#e76565";
  roundedRect(context, point.x - size * 0.42, point.y + size * 0.25, size * 0.84, size * 0.72, size * 0.28);
  context.beginPath();
  context.arc(point.x, point.y, size * 0.48, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255, 234, 214, .48)";
  context.lineWidth = Math.max(1, size * 0.035);
  context.stroke();

  drawFace(context, point.x, point.y, size, "angry");

  context.fillStyle = "rgba(22, 7, 5, .82)";
  roundedRect(context, point.x - size * 0.46, point.y - size * 0.83, size * 0.92, size * 0.24, size * 0.12);
  context.fillStyle = "#fff1e7";
  context.font = `800 ${Math.max(8, size * 0.14)}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("THREAT", point.x, point.y - size * 0.71);
}

export function ParticipantScene2D({ snapshot }: ParticipantScene2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const bounds = canvas!.getBoundingClientRect();
      const nativeRatio = Math.max(1, window.devicePixelRatio || 1);
      const safeRatio = 8192 / Math.max(1, bounds.width, bounds.height);
      const ratio = Math.max(1, Math.min(nativeRatio, safeRatio));
      const width = Math.max(300, Math.round(bounds.width * ratio));
      const height = Math.max(300, Math.round(bounds.height * ratio));
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
      }
      const context = canvas!.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const w = width / ratio;
      const h = height / ratio;
      context.clearRect(0, 0, w, h);

      const neutral = snapshot.config.mode === "passthrough";
      const sky = context.createLinearGradient(0, 0, 0, h * 0.62);
      sky.addColorStop(0, neutral ? "#243c39" : "#071a19");
      sky.addColorStop(1, neutral ? "#4b6960" : "#315c4c");
      context.fillStyle = sky;
      context.fillRect(0, 0, w, h * 0.62);

      const ground = context.createLinearGradient(0, h * 0.32, 0, h);
      ground.addColorStop(0, neutral ? "#355149" : "#24483b");
      ground.addColorStop(1, neutral ? "#152c27" : "#081b16");
      context.fillStyle = ground;
      context.fillRect(0, h * 0.32, w, h * 0.68);

      if (!neutral) {
        context.fillStyle = "rgba(238, 209, 148, .78)";
        context.beginPath();
        context.arc(w * 0.78, h * 0.13, Math.max(12, w * 0.025), 0, Math.PI * 2);
        context.fill();

        const pathGradient = context.createLinearGradient(0, h * 0.29, 0, h * 0.88);
        pathGradient.addColorStop(0, "rgba(82, 110, 85, .18)");
        pathGradient.addColorStop(1, "rgba(54, 76, 62, .42)");
        context.fillStyle = pathGradient;
        context.beginPath();
        context.moveTo(w * 0.475, h * 0.29);
        context.lineTo(w * 0.525, h * 0.29);
        context.lineTo(w * 0.69, h * 0.88);
        context.lineTo(w * 0.31, h * 0.88);
        context.closePath();
        context.fill();

        const sortedForest = [...FOREST_TREES].sort((left, right) => left.z - right.z);
        for (const tree of sortedForest) {
          const depth = clamp((tree.z + 21) / 18);
          const perspective = 0.68 + depth * 0.4;
          const treeX = w * 0.5 + tree.x * w * 0.048 * perspective;
          const groundY = h * (0.315 + depth * 0.14);
          const treeHeight = h * (0.105 + tree.scale * 0.05) * (0.7 + depth * 0.35);
          drawForestTree2D(context, tree, treeX, groundY, treeHeight, 0.52 + depth * 0.38);
        }

        const mist = context.createLinearGradient(0, h * 0.22, 0, h * 0.43);
        mist.addColorStop(0, "rgba(125, 168, 142, 0)");
        mist.addColorStop(0.55, "rgba(125, 168, 142, .08)");
        mist.addColorStop(1, "rgba(125, 168, 142, 0)");
        context.fillStyle = mist;
        context.fillRect(0, h * 0.2, w, h * 0.25);
      }

      const project = (x: number, z: number) => {
        const depth = clamp((z + 8.5) / 13.5);
        return {
          x: w * 0.5 + x * w * 0.087 * (0.72 + depth * 0.28),
          y: h * 0.2 + depth * h * 0.61,
          scale: clamp((Math.min(w, 780) / 700) * (0.62 + depth * 0.52), 0.48, 1.22),
        };
      };

      context.strokeStyle = "rgba(210, 245, 228, .12)";
      context.lineWidth = 1;
      for (const z of [-7, -5, -3, -1, 1, 3]) {
        const left = project(-5.2, z);
        const right = project(5.2, z);
        context.beginPath();
        context.moveTo(left.x, left.y);
        context.lineTo(right.x, right.y);
        context.stroke();
      }
      for (const x of [-4, -2, 0, 2, 4]) {
        const far = project(x * 0.28, -8.5);
        const near = project(x, 5);
        context.beginPath();
        context.moveTo(far.x, far.y);
        context.lineTo(near.x, near.y);
        context.stroke();
      }

      const safetyLeft = project(-5.2, -snapshot.minimumThreatDistance);
      const safetyRight = project(5.2, -snapshot.minimumThreatDistance);
      context.setLineDash([7, 7]);
      context.strokeStyle = "rgba(255, 196, 112, .72)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(safetyLeft.x, safetyLeft.y);
      context.lineTo(safetyRight.x, safetyRight.y);
      context.stroke();
      context.setLineDash([]);

      const entities = [
        ...snapshot.agents.map((agent, index) => ({ z: agent.z, kind: "agent" as const, agent, index })),
        { z: snapshot.threat.z, kind: "threat" as const },
      ].sort((a, b) => a.z - b.z);
      for (const entity of entities) {
        if (entity.kind === "agent") drawAgent(context, entity.agent, entity.index, project, snapshot);
        else drawThreat(context, snapshot, project);
      }

      const observerY = h * 0.91;
      context.fillStyle = "rgba(4, 17, 13, .78)";
      context.beginPath();
      context.arc(w * 0.5, observerY - 17, 17, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.ellipse(w * 0.5, observerY + 20, 46, 32, 0, Math.PI, Math.PI * 2);
      context.fill();
      context.fillStyle = "#e8fbf1";
      roundedRect(context, w * 0.5 - 24, observerY + 3, 48, 20, 10);
      context.fillStyle = "#12372c";
      context.font = "800 9px system-ui";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("YOU", w * 0.5, observerY + 13);

      const vignette = context.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.18, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,8,6,.46)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, w, h);
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [snapshot]);

  return (
    <canvas
      ref={canvasRef}
      className="participant-canvas"
      role="img"
      aria-label={`Two-dimensional trial scene. ${snapshot.agents.filter((agent) => agent.expression === "afraid").length} of ${snapshot.agents.length} agents show fear. The ${snapshot.threat.kind === "shadow" ? "shrouded shadow" : snapshot.threat.kind === "spider" ? "spider" : "angry agent"} is ${snapshot.threat.distance.toFixed(1)} metres away.`}
    />
  );
}
