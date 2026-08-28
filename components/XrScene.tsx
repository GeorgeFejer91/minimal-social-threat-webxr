"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Expression, SceneMode, SceneSnapshot, ThreatKind } from "../lib/scenario";
import type { SpatialAudioEngine } from "../lib/spatial-audio";

export interface XrSceneHandle {
  enter(mode: SceneMode): Promise<void>;
  exit(): Promise<void>;
}

interface XrSceneProps {
  snapshot: SceneSnapshot;
  audioEngine?: SpatialAudioEngine;
  onStartRequest(): void;
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

  context.fillStyle = color;
  context.beginPath(); context.arc(128, 128, 96, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "rgba(14, 28, 24, .42)";
  context.lineWidth = 8;
  context.stroke();

  void threatKind;

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

function dialogueTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 150;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(5, 20, 17, .9)";
  context.beginPath(); context.roundRect(8, 8, 624, 134, 32); context.fill();
  context.strokeStyle = "rgba(205, 244, 225, .25)";
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = "#effff7";
  context.font = "700 38px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 320, 76, 570);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeAgent(color: string) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.29, 0.58, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
  );
  body.position.y = 0.82;
  group.add(body);

  const head = new THREE.Group();
  head.position.y = 1.53;
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
  );
  head.add(headMesh);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.58),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide }),
  );
  face.position.z = 0.323;
  face.userData.isFace = true;
  head.add(face);
  group.add(head);

  const limbMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 1.14, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 7), limbMaterial);
    arm.position.y = -0.24;
    pivot.add(arm);
    group.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const dialogue = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  dialogue.position.y = 2.18;
  dialogue.scale.set(1.55, 0.36, 1);
  dialogue.visible = false;
  group.add(dialogue);

  group.userData.body = body;
  group.userData.head = head;
  group.userData.face = face;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.dialogue = dialogue;
  return group;
}

function makeThreat() {
  const root = new THREE.Group();

  const shadow = new THREE.Group();
  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.82, 1.9, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x030308, roughness: 1, transparent: true, opacity: 0.94, side: THREE.DoubleSide }),
  );
  cloak.position.y = 0.88;
  shadow.add(cloak);
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0x020207, roughness: 1 }),
  );
  hood.position.y = 1.67;
  shadow.add(hood);
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0x080712, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
  );
  aura.position.y = 1.03;
  aura.scale.y = 1.35;
  shadow.add(aura);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3c32 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMaterial);
    eye.position.set(side * 0.13, 1.72, 0.37);
    shadow.add(eye);
  }
  root.add(shadow);

  const angryAgent = makeAgent("#c55252");
  angryAgent.visible = false;
  angryAgent.scale.setScalar(1.16);
  root.add(angryAgent);
  root.userData.shadow = shadow;
  root.userData.aura = aura;
  root.userData.eyeMaterial = eyeMaterial;
  root.userData.angryAgent = angryAgent;
  return root;
}

const XrScene = forwardRef<XrSceneHandle, XrSceneProps>(function XrScene(
  { snapshot, audioEngine, onStartRequest, onPauseRequest, onSessionChange, onStatus },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(snapshot);
  const startRef = useRef(onStartRequest);
  const pauseRef = useRef(onPauseRequest);
  const audioRef = useRef(audioEngine);
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
  useEffect(() => { startRef.current = onStartRequest; }, [onStartRequest]);
  useEffect(() => { pauseRef.current = onPauseRequest; }, [onPauseRequest]);
  useEffect(() => { audioRef.current = audioEngine; }, [audioEngine]);

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

    const colors = ["#5eae92", "#6ba7c7", "#b48ac6", "#d1a66f", "#75b87c", "#cf7985"];
    for (let index = 0; index < stateRef.current.agents.length; index += 1) {
      const agentState = stateRef.current.agents[index];
      const agent = makeAgent(colors[index % colors.length]);
      agent.userData.color = colors[index % colors.length];
      scene.add(agent);
      agentRefs.current.set(agentState.id, agent);
    }
    const threat = makeThreat();
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
      onStatus("Immersive scene ready. Press A on the right controller to start; either trigger pauses.");
    });
    renderer.xr.addEventListener("sessionend", () => {
      camera.position.set(0, 3.3, 6.8);
      controls.enabled = !coarsePointer;
      controls.target.set(0, 1.1, -1.5);
      applyMode(stateRef.current.config.mode);
      onSessionChange(false);
      onStatus("Immersive session ended; the optional 3D preview remains available.");
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

    const listenerPosition = new THREE.Vector3();
    const listenerQuaternion = new THREE.Quaternion();
    const listenerForward = new THREE.Vector3();
    const listenerUp = new THREE.Vector3();
    let rightAWasPressed = false;

    renderer.setAnimationLoop((time) => {
      const state = stateRef.current;
      if (renderer.xr.isPresenting) {
        const rightController = Array.from(renderer.xr.getSession()?.inputSources ?? [])
          .find((source) => source.handedness === "right" && source.gamepad);
        const rightAIsPressed = Boolean(rightController?.gamepad?.buttons[4]?.pressed);
        if (rightAIsPressed && !rightAWasPressed) startRef.current();
        rightAWasPressed = rightAIsPressed;
      } else {
        rightAWasPressed = false;
      }
      for (const agentState of state.agents) {
        const agent = agentRefs.current.get(agentState.id);
        if (!agent) continue;
        const gaitWave = Math.sin(agentState.gait * Math.PI * 2);
        const moving = agentState.behavior === "meander" || agentState.behavior === "flee";
        const bob = moving ? Math.abs(gaitWave) * (agentState.behavior === "flee" ? 0.07 : 0.025) : 0;
        agent.position.set(agentState.x, bob, agentState.z);
        agent.rotation.y = agentState.yaw;
        const face = agent.userData.face as THREE.Mesh | undefined;
        if (face) {
          const keyName = `${agent.userData.color}-${agentState.expression}`;
          (face.material as THREE.MeshBasicMaterial).map = texture(keyName, () => faceTexture(agentState.expression, agent.userData.color));
          (face.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        const leftArm = agent.userData.leftArm as THREE.Group;
        const rightArm = agent.userData.rightArm as THREE.Group;
        const head = agent.userData.head as THREE.Group;
        leftArm.rotation.x = moving ? gaitWave * 0.58 : agentState.behavior === "startle" ? -0.9 : 0;
        rightArm.rotation.x = moving ? -gaitWave * 0.58 : agentState.behavior === "startle" ? -0.9 : 0;
        rightArm.rotation.z = agentState.behavior === "talk" ? -0.36 - Math.sin(agentState.gesture * Math.PI * 2) * 0.2 : 0;
        leftArm.rotation.z = agentState.behavior === "startle" ? 0.52 : 0;
        head.rotation.x = agentState.behavior === "listen" ? Math.sin(agentState.gesture * Math.PI * 2) * 0.08 : agentState.fear * 0.12;
        head.rotation.z = agentState.behavior === "listen" ? 0.08 : 0;

        const dialogue = agent.userData.dialogue as THREE.Sprite;
        const cue = state.audioCues.find((item) => item.sourceId === agentState.id);
        dialogue.visible = Boolean(cue);
        if (cue) {
          (dialogue.material as THREE.SpriteMaterial).map = texture(`dialogue-${cue.text}`, () => dialogueTexture(cue.text));
          (dialogue.material as THREE.SpriteMaterial).needsUpdate = true;
        }
        const fearPulse = agentState.expression === "afraid" ? 1 + Math.sin(time * 0.015 + agentState.x) * 0.035 : 1;
        agent.scale.set(fearPulse, fearPulse, fearPulse);
      }
      if (threatRef.current) {
        const threatState = state.threat;
        const threat = threatRef.current;
        threat.position.set(threatState.x, 0, threatState.z);
        const shadow = threat.userData.shadow as THREE.Group;
        const angryAgent = threat.userData.angryAgent as THREE.Group;
        shadow.visible = threatState.kind === "shadow";
        angryAgent.visible = threatState.kind === "angry-agent";
        if (angryAgent.visible) {
          const face = angryAgent.userData.face as THREE.Mesh;
          (face.material as THREE.MeshBasicMaterial).map = texture("threat-angry", () => faceTexture("angry", "#e45d5d", "angry-agent"));
          (face.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        const pulse = 1.05 + Math.sin(time * 0.006) * 0.035;
        threat.scale.setScalar(pulse);
        const aura = threat.userData.aura as THREE.Mesh;
        (aura.material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(time * 0.0043) * 0.045;
      }
      if (renderer.xr.isPresenting && audioRef.current?.enabled) {
        const xrCamera = renderer.xr.getCamera(camera);
        xrCamera.getWorldPosition(listenerPosition);
        xrCamera.getWorldQuaternion(listenerQuaternion);
        listenerForward.set(0, 0, -1).applyQuaternion(listenerQuaternion);
        listenerUp.set(0, 1, 0).applyQuaternion(listenerQuaternion);
        audioRef.current.setListenerPose(
          listenerPosition.x, listenerPosition.y, listenerPosition.z,
          listenerForward.x, listenerForward.y, listenerForward.z,
          listenerUp.x, listenerUp.y, listenerUp.z,
        );
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
