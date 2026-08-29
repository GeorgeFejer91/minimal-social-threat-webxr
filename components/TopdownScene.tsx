"use client";

import { useEffect, useRef } from "react";
import type { SceneSnapshot } from "../lib/scenario";

interface TopdownSceneProps {
  snapshot?: SceneSnapshot;
  stale?: boolean;
  fill?: boolean;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

export function TopdownScene({ snapshot, stale = false, fill = false }: TopdownSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const bounds = canvas!.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(320, Math.round(bounds.width * ratio));
      const height = Math.max(320, Math.round(bounds.height * ratio));
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
      }
      const context = canvas!.getContext("2d");
      if (!context) return;
      context.resetTransform();
      context.scale(ratio, ratio);
      const w = width / ratio;
      const h = height / ratio;
      context.clearRect(0, 0, w, h);

      const gradient = context.createRadialGradient(w * 0.5, h * 0.47, 20, w * 0.5, h * 0.5, w * 0.72);
      gradient.addColorStop(0, "#17392f");
      gradient.addColorStop(1, "#081814");
      context.fillStyle = gradient;
      roundRect(context, 0, 0, w, h, 22);

      const scale = Math.min(w, h) / (fill ? 23 : 21);
      const ox = w / 2;
      const oz = h * 0.82;
      const point = (x: number, z: number) => ({ x: ox + x * scale, y: oz + z * scale });

      context.strokeStyle = "rgba(194, 238, 215, 0.10)";
      context.lineWidth = 1;
      for (let meter = -16; meter <= 4; meter += 2) {
        const x = ox + meter * scale;
        const y = oz + meter * scale;
        context.beginPath(); context.moveTo(x, oz - 9 * scale); context.lineTo(x, oz + 9 * scale); context.stroke();
        context.beginPath(); context.moveTo(ox - 9 * scale, y); context.lineTo(ox + 9 * scale, y); context.stroke();
      }

      const viewer = point(0, 0);
      const safetyRadius = (snapshot?.minimumThreatDistance ?? 1.8) * scale;
      context.setLineDash([5, 6]);
      context.strokeStyle = "rgba(255, 196, 119, 0.45)";
      context.beginPath(); context.arc(viewer.x, viewer.y, safetyRadius, 0, Math.PI * 2); context.stroke();
      context.setLineDash([]);

      context.fillStyle = "#dff6ea";
      context.beginPath(); context.arc(viewer.x, viewer.y, 11, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#17392f";
      context.beginPath(); context.moveTo(viewer.x, viewer.y - 8); context.lineTo(viewer.x - 5, viewer.y + 4); context.lineTo(viewer.x + 5, viewer.y + 4); context.closePath(); context.fill();
      context.fillStyle = "rgba(223,246,234,.72)";
      context.font = "600 11px system-ui";
      context.textAlign = "center";
      context.fillText("OBSERVER", viewer.x, viewer.y + 27);

      if (snapshot) {
        const threat = point(snapshot.threat.x, snapshot.threat.z);
        context.strokeStyle = "rgba(255, 126, 76, .28)";
        context.lineWidth = 3;
        context.beginPath(); context.moveTo(threat.x, threat.y); context.lineTo(viewer.x, viewer.y); context.stroke();

        const agentById = new Map(snapshot.agents.map((agent) => [agent.id, agent]));
        for (const link of snapshot.socialLinks) {
          const source = agentById.get(link.sourceId);
          const target = agentById.get(link.targetId);
          if (!source || !target) continue;
          const from = point(source.x, source.z);
          const to = point(target.x, target.z);
          context.setLineDash(link.kind === "alarm" ? [3, 4] : [6, 5]);
          context.strokeStyle = link.kind === "alarm" ? "rgba(255, 161, 112, .56)" : "rgba(134, 211, 178, .32)";
          context.lineWidth = link.kind === "alarm" ? 2 : 1.5;
          context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
        }
        context.setLineDash([]);

        for (const agent of snapshot.agents) {
          const p = point(agent.x, agent.z);
          const color = agent.expression === "afraid" ? "#f4c778" : agent.expression === "alert" ? "#b7df91" : "#89cdb6";
          context.fillStyle = color;
          context.beginPath(); context.arc(p.x, p.y, 10, 0, Math.PI * 2); context.fill();
          context.strokeStyle = "rgba(5, 22, 18, .75)";
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(p.x, p.y);
          context.lineTo(p.x + Math.sin(agent.yaw) * 17, p.y + Math.cos(agent.yaw) * 17);
          context.stroke();
          context.fillStyle = "rgba(235, 255, 246, .82)";
          context.font = "700 8px system-ui";
          context.textAlign = "center";
          context.fillText(agent.behavior.toUpperCase(), p.x, p.y + 22);
        }

        context.save();
        const nonHumanThreat = snapshot.threat.kind !== "angry-agent";
        context.globalAlpha = nonHumanThreat ? 0.22 + snapshot.threat.visibility * 0.78 : 1;
        context.fillStyle = snapshot.threat.kind === "shadow" ? "rgba(2, 2, 8, .94)" : snapshot.threat.kind === "spider" ? "#321a13" : "#ef6262";
        context.beginPath(); context.arc(threat.x, threat.y, snapshot.threat.kind === "shadow" ? 18 : 15, 0, Math.PI * 2); context.fill();
        context.strokeStyle = snapshot.threat.kind === "shadow" ? "#ff453a" : snapshot.threat.kind === "spider" ? "#c58b5f" : "#2a1111";
        context.lineWidth = snapshot.threat.kind === "shadow" ? 2 : 3;
        context.beginPath(); context.moveTo(threat.x - 7, threat.y - 3); context.lineTo(threat.x - 2, threat.y); context.stroke();
        context.beginPath(); context.moveTo(threat.x + 7, threat.y - 3); context.lineTo(threat.x + 2, threat.y); context.stroke();
        context.fillStyle = "#fff2dc";
        context.font = "700 11px system-ui";
        context.fillText(snapshot.threat.kind === "shadow" ? "SHADOW" : snapshot.threat.kind === "spider" ? "SPIDER" : "THREAT", threat.x, threat.y - 25);
        context.restore();

        if (!fill) {
          context.fillStyle = "rgba(6, 20, 17, .86)";
          roundRect(context, 14, 14, 168, 58, 13);
          context.textAlign = "left";
          context.fillStyle = "#f1fff8";
          context.font = "700 12px system-ui";
          context.fillText(snapshot.phase.toUpperCase(), 27, 37);
          context.fillStyle = "#a9cfbd";
          context.font = "500 11px system-ui";
          context.fillText(`${(snapshot.elapsedMs / 1_000).toFixed(1)} s · threat ${snapshot.threat.distance.toFixed(1)} m`, 27, 57);
        }
      } else {
        context.fillStyle = "rgba(223,246,234,.65)";
        context.font = "600 13px system-ui";
        context.textAlign = "center";
        context.fillText("Connect to a trial scene", viewer.x, h - 30);
      }

      if (stale) {
        context.fillStyle = "rgba(34, 15, 14, .64)";
        roundRect(context, 0, 0, w, h, 22);
        context.fillStyle = "#ffd7c7";
        context.font = "800 14px system-ui";
        context.textAlign = "center";
        context.fillText("STREAM STALE · LAST FRAME HELD", w / 2, h / 2);
      }
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fill, snapshot, stale]);

  return <canvas ref={canvasRef} className={`topdown-canvas${fill ? " topdown-canvas-fill" : ""}`} aria-label="Live top-down view of the observer, social agents, and approaching threat" />;
}
