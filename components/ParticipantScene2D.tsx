"use client";

import { useEffect, useRef } from "react";
import type { AgentState, Expression, SceneSnapshot } from "../lib/scenario";

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

function drawFace(context: CanvasRenderingContext2D, x: number, y: number, size: number, expression: Expression) {
  const eyeY = y - size * 0.08;
  const eyeGap = size * 0.17;
  const eyeRadius = Math.max(1.5, size * (expression === "alert" ? 0.065 : 0.048));
  context.strokeStyle = "#102720";
  context.fillStyle = "#102720";
  context.lineWidth = Math.max(1.5, size * 0.045);
  context.lineCap = "round";

  if (expression === "afraid" || expression === "angry") {
    const direction = expression === "angry" ? 1 : -1;
    context.beginPath();
    context.moveTo(x - eyeGap - size * 0.08, eyeY - direction * size * 0.07);
    context.lineTo(x - eyeGap + size * 0.07, eyeY + direction * size * 0.02);
    context.moveTo(x + eyeGap - size * 0.07, eyeY + direction * size * 0.02);
    context.lineTo(x + eyeGap + size * 0.08, eyeY - direction * size * 0.07);
    context.stroke();
  }

  context.beginPath();
  context.arc(x - eyeGap, eyeY, eyeRadius, 0, Math.PI * 2);
  context.arc(x + eyeGap, eyeY, eyeRadius, 0, Math.PI * 2);
  context.fill();

  if (expression === "calm") {
    context.beginPath();
    context.arc(x, y + size * 0.08, size * 0.16, 0.12 * Math.PI, 0.88 * Math.PI);
    context.stroke();
  } else if (expression === "angry") {
    context.beginPath();
    context.arc(x, y + size * 0.28, size * 0.18, 1.15 * Math.PI, 1.85 * Math.PI);
    context.stroke();
  } else {
    context.beginPath();
    context.ellipse(x, y + size * 0.18, size * 0.09, size * (expression === "afraid" ? 0.13 : 0.09), 0, 0, Math.PI * 2);
    context.stroke();
  }
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

  context.fillStyle = color;
  roundedRect(context, point.x - size * 0.4, point.y + size * 0.25, size * 0.8, size * 0.7, size * 0.28);
  context.beginPath();
  context.arc(point.x, point.y, size * 0.46, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(239, 255, 248, .36)";
  context.lineWidth = Math.max(1, size * 0.035);
  context.stroke();
  drawFace(context, point.x, point.y, size, agent.expression);

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
      const ratio = Math.min(2, window.devicePixelRatio || 1);
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
        context.fillStyle = "rgba(6, 21, 17, .42)";
        for (let index = 0; index < 11; index += 1) {
          const treeX = (index / 10) * w;
          const treeHeight = h * (0.08 + (index % 3) * 0.018);
          context.beginPath();
          context.moveTo(treeX - w * 0.035, h * 0.34);
          context.lineTo(treeX, h * 0.34 - treeHeight);
          context.lineTo(treeX + w * 0.035, h * 0.34);
          context.fill();
        }
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
      aria-label={`Two-dimensional trial scene. ${snapshot.agents.filter((agent) => agent.expression === "afraid").length} of six agents show fear. The ${snapshot.threat.kind === "shadow" ? "shrouded shadow" : "angry agent"} is ${snapshot.threat.distance.toFixed(1)} metres away.`}
    />
  );
}
