"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Expression, SceneMode, SceneSnapshot, ThreatKind } from "../lib/scenario";

export interface XrSceneHandle {
  enter(mode: SceneMode): Promise<void>;
  exit(): Promise<void>;
}

interface XrSceneProps {
  snapshot: SceneSnapshot;
  onPauseRequest(): void;
  onSessionChange(active: boolean, mode?: SceneMode): void;
  onStatus(message: string): void;
}

function faceTexture(expression: Expression | "angry", color: string, threatKind?: ThreatKind) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, 256, 256);

  if (threatKind === "tiger") {
    context.fillStyle = "#ff9147";
    context.beginPath(); context.moveTo(44, 65); context.lineTo(62, 8); context.lineTo(105, 47); context.closePath(); context.fill();
    context.beginPath(); context.moveTo(212, 65); context.lineTo(194, 8); context.lineTo(151, 47); context.closePath(); context.fill();
  }
  context.fillStyle = color;
  context.beginPath(); context.arc(128, 128, 96, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "rgba(14, 28, 24, .42)";
  context.lineWidth = 8;
  context.stroke();

  if (threatKind === "tiger") {
    context.fillStyle = "#1f201a";
    for (const x of [78, 128, 178]) {
      context.beginPath(); context.moveTo(x - 12, 37); context.lineTo(x, 78); context.lineTo(x + 12, 37); context.closePath(); context.fill();
    }
    context.fillStyle = "#fff0d8";
    context.beginPath(); context.ellipse(128, 151, 48, 38, 0, 0, Math.PI * 2); context.fill();
  }

  context.strokeStyle = "#17231e";
  context.fillStyle = "#17231e";
  context.lineCap = "round";
  context.lineWidth = 13;
  if (expression === "angry") {
    context.beginPath(); context.moveTo(73, 89); context.lineTo(106, 101); context.stroke();
    context.beginPath(); context.moveTo(183, 89); context.lineTo(150, 101); context.stroke();
  }
  if (expression === "afraid" || expression === "alert") {
    context.beginPath(); context.arc(89, 99, expression === "afraid" ? 11 : 9, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(167, 99, expression === "afraid" ? 11 : 9, 0, Math.PI * 2); context.fill();
  } else {
    context.beginPath(); context.arc(89, 103, 8, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(167, 103, 8, 0, Math.PI * 2); context.fill();
  }

  context.lineWidth = 11;
  if (expression === "calm") {
    context.beginPath(); context.arc(128, 133, 32, 0.18, Math.PI - 0.18); context.stroke();
  } else if (expression === "angry") {
    context.beginPath(); context.arc(128, 179, 33, Math.PI + 0.25, Math.PI * 2 - 0.25); context.stroke();
  } else {
    context.beginPath(); context.arc(128, 157, expression === "afraid" ? 20 : 13, 0, Math.PI * 2); context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function informationTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(5, 20, 16, .78)";
  context.beginPath(); context.roundRect(4, 4, 760, 152, 30); context.fill();
  context.fillStyle = "#eefbf4";
  context.font = "700 38px system-ui";
  context.textAlign = "center";
  context.fillText("Either controller trigger pauses", 384, 70);
  context.fillStyle = "#b4d4c5";
  context.font = "500 28px system-ui";
  context.fillText("Threat stops at the marked safety distance", 384, 116);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeAgent(color: string) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.58, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
  );
  body.position.y = 0.63;
  group.add(body);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  face.position.y = 1.46;
  face.scale.set(0.86, 0.86, 1);
  face.userData.isFace = true;
  group.add(face);
  return group;
}

const XrScene = forwardRef<XrSceneHandle, XrSceneProps>(function XrScene(
  { snapshot, onPauseRequest, onSessionChange, onStatus },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(snapshot);
  const pauseRef = useRef(onPauseRequest);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const cameraRef = useRef<THREE.PerspectiveCamera | undefined>(undefined);
  const controlsRef = useRef<OrbitControls | undefined>(undefined);
  const environmentRef = useRef<THREE.Group | undefined>(undefined);
  const agentRefs = useRef(new Map<string, THREE.Group>());
  const threatRef = useRef<THREE.Group | undefined>(undefined);
  const activeModeRef = useRef<SceneMode>(snapshot.config.mode);
  const textureCache = useRef(new Map<string, THREE.Texture>());

  useEffect(() => { stateRef.current = snapshot; }, [snapshot]);
  useEffect(() => { pauseRef.current = onPauseRequest; }, [onPauseRequest]);

  function texture(key: string, create: () => THREE.Texture) {
    if (!textureCache.current.has(key)) textureCache.current.set(key, create());
    return textureCache.current.get(key)!;
  }

  function applyMode(mode: SceneMode) {
    activeModeRef.current = mode;
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer) return;
    const passthrough = mode === "passthrough";
    scene.background = passthrough ? null : new THREE.Color(0x071c18);
    if (environmentRef.current) environmentRef.current.visible = !passthrough;
    renderer.setClearColor(passthrough ? 0x000000 : 0x071c18, passthrough ? 0 : 1);
  }

  useImperativeHandle(ref, () => ({
    async enter(mode: SceneMode) {
      const renderer = rendererRef.current;
      if (!renderer || !navigator.xr) throw new Error("Immersive WebXR is not available in this browser.");
      applyMode(mode);
      const sessionMode: XRSessionMode = mode === "passthrough" ? "immersive-ar" : "immersive-vr";
      const options: XRSessionInit = {
        requiredFeatures: ["local-floor"],
        optionalFeatures: mode === "passthrough" ? ["dom-overlay"] : [],
      };
      if (mode === "passthrough") (options as XRSessionInit & { domOverlay: { root: Element } }).domOverlay = { root: document.body };
      onStatus(`Requesting ${mode === "passthrough" ? "mixed reality" : "virtual reality"}…`);
      const session = await navigator.xr.requestSession(sessionMode, options);
      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(session);
    },
    async exit() {
      await rendererRef.current?.xr.getSession()?.end();
    },
  }), [onStatus]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const cachedTextures = textureCache.current;
    const agents = agentRefs.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 60);
    camera.position.set(0, 3.3, 6.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)").matches ?? false;
    controls.target.set(0, 1.1, -1.5);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enabled = !coarsePointer;
    controls.minDistance = 3.5;
    controls.maxDistance = 11;
    renderer.domElement.style.touchAction = coarsePointer ? "pan-y" : "none";
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xcaf6e3, 0x253228, 2.1));
    const key = new THREE.DirectionalLight(0xffddb4, 2.5);
    key.position.set(-3, 7, 2);
    scene.add(key);

    const environment = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshStandardMaterial({ color: 0x183d32, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    environment.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.78, 1.83, 64),
      new THREE.MeshBasicMaterial({ color: 0xf3b563, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.006;
    scene.add(ring);
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const radius = 7.5 + (index % 3) * 0.8;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.1, 7), new THREE.MeshStandardMaterial({ color: 0x5d4533 }));
      trunk.position.y = 0.55;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), new THREE.MeshStandardMaterial({ color: index % 2 ? 0x215443 : 0x28644f }));
      crown.position.y = 1.65;
      tree.add(trunk, crown);
      tree.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      environment.add(tree);
    }
    scene.add(environment);
    environmentRef.current = environment;

    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: informationTexture(), transparent: true, depthWrite: false }));
    sign.position.set(0, 2.55, -2.65);
    sign.scale.set(3.6, 0.75, 1);
    scene.add(sign);

    const colors = ["#5eae92", "#6ba7c7", "#b48ac6", "#d1a66f", "#75b87c", "#cf7985"];
    for (let index = 0; index < stateRef.current.agents.length; index += 1) {
      const agentState = stateRef.current.agents[index];
      const agent = makeAgent(colors[index % colors.length]);
      agent.userData.color = colors[index % colors.length];
      scene.add(agent);
      agentRefs.current.set(agentState.id, agent);
    }
    const threat = makeAgent("#c55252");
    threat.scale.setScalar(1.3);
    scene.add(threat);
    threatRef.current = threat;

    for (let index = 0; index < 2; index += 1) {
      const controller = renderer.xr.getController(index);
      controller.addEventListener("select", () => pauseRef.current());
      scene.add(controller);
    }

    renderer.xr.addEventListener("sessionstart", () => {
      controls.enabled = false;
      camera.position.set(0, 0, 0);
      onSessionChange(true, activeModeRef.current);
      onStatus("Immersive scene active. Pull either trigger to pause.");
    });
    renderer.xr.addEventListener("sessionend", () => {
      camera.position.set(0, 3.3, 6.8);
      controls.enabled = !coarsePointer;
      controls.target.set(0, 1.1, -1.5);
      applyMode(stateRef.current.config.mode);
      onSessionChange(false);
      onStatus("Immersive session ended; desktop preview remains available.");
    });

    const resize = () => {
      const rect = host.getBoundingClientRect();
      camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(rect.width, rect.height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    applyMode(stateRef.current.config.mode);

    renderer.setAnimationLoop((time) => {
      const state = stateRef.current;
      for (const agentState of state.agents) {
        const agent = agentRefs.current.get(agentState.id);
        if (!agent) continue;
        agent.position.set(agentState.x, 0, agentState.z);
        agent.rotation.y = agentState.yaw;
        const face = agent.children.find((child) => child.userData.isFace) as THREE.Sprite | undefined;
        if (face) {
          const keyName = `${agent.userData.color}-${agentState.expression}`;
          (face.material as THREE.SpriteMaterial).map = texture(keyName, () => faceTexture(agentState.expression, agent.userData.color));
          (face.material as THREE.SpriteMaterial).needsUpdate = true;
        }
        const fearPulse = agentState.expression === "afraid" ? 1 + Math.sin(time * 0.015 + agentState.x) * 0.035 : 1;
        agent.scale.set(fearPulse, fearPulse, fearPulse);
      }
      if (threatRef.current) {
        const threatState = state.threat;
        threatRef.current.position.set(threatState.x, 0, threatState.z);
        const face = threatRef.current.children.find((child) => child.userData.isFace) as THREE.Sprite | undefined;
        if (face) {
          const keyName = `threat-${threatState.kind}`;
          (face.material as THREE.SpriteMaterial).map = texture(keyName, () => faceTexture("angry", threatState.kind === "tiger" ? "#ff9147" : "#e45d5d", threatState.kind));
          (face.material as THREE.SpriteMaterial).needsUpdate = true;
        }
        const pulse = 1.26 + Math.sin(time * 0.007) * 0.025;
        threatRef.current.scale.setScalar(pulse);
      }
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      void renderer.xr.getSession()?.end();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      cachedTextures.forEach((item) => item.dispose());
      cachedTextures.clear();
      agents.clear();
    };
  }, [onSessionChange, onStatus]);

  useEffect(() => {
    if (!rendererRef.current?.xr.isPresenting) applyMode(snapshot.config.mode);
  }, [snapshot.config.mode]);

  return <div ref={hostRef} className="xr-scene" aria-label="Interactive first-person preview of the social threat scenario" />;
});

export default XrScene;
