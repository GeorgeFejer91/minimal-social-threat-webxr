"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { faceGeometryToSphereMeshData, scenarioFaceGeometry, type TriangleMeshData } from "../lib/facial-expression";
import { FOREST_TREES, type ForestTree } from "../lib/forest-layout";
import type { Expression, SceneMode, SceneSnapshot } from "../lib/scenario";
import { spiderMotionPose, type SpiderLegSide } from "../lib/spider-motion";
import type { SpatialAudioEngine } from "../lib/spatial-audio";

export interface XrSceneHandle {
  enter(mode: SceneMode): Promise<void>;
  exit(): Promise<void>;
}

interface XrSceneProps {
  snapshot: SceneSnapshot;
  visible: boolean;
  audioEngine?: SpatialAudioEngine;
  onFrame(time: number): void;
  onReady(ready: boolean): void;
  onStartRequest(): void;
  onPauseRequest(): void;
  onSessionChange(active: boolean, mode?: SceneMode): void;
  onStatus(message: string): void;
}

interface FaceSurface {
  group: THREE.Group;
  strokes: THREE.Mesh;
  eyeFills: THREE.Mesh;
  darkFills: THREE.Mesh;
  signature: string;
}

interface SpiderLegRig {
  side: SpiderLegSide;
  pair: 0 | 1 | 2 | 3;
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
}

function makeFaceSurface(): FaceSurface {
  const group = new THREE.Group();
  const layer = (color: number, renderOrder: number) => {
    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    mesh.renderOrder = renderOrder;
    group.add(mesh);
    return mesh;
  };
  const eyeFills = layer(0xeffff7, 1);
  const darkFills = layer(0x17231e, 2);
  const strokes = layer(0x17231e, 3);
  group.userData.isVectorFace = true;
  return { group, strokes, eyeFills, darkFills, signature: "" };
}

function updateFaceMesh(mesh: THREE.Mesh, data: TriangleMeshData) {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const existingPositions = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (existingPositions?.array.length === data.positions.length) {
    (existingPositions.array as Float32Array).set(data.positions);
    existingPositions.needsUpdate = true;
  } else {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
  }
  const existingIndex = geometry.getIndex();
  if (existingIndex?.array.length === data.indices.length) {
    (existingIndex.array as Uint16Array | Uint32Array).set(data.indices);
    existingIndex.needsUpdate = true;
  } else {
    geometry.setIndex(data.indices);
  }
  geometry.computeBoundingSphere();
}

function updateFaceSurface(surface: FaceSurface, expression: Expression, fear: number) {
  const signature = `${expression}:${fear.toFixed(3)}`;
  if (surface.signature === signature) return;
  surface.signature = signature;
  const data = faceGeometryToSphereMeshData(scenarioFaceGeometry(expression, fear), 0.344, undefined, 32);
  updateFaceMesh(surface.strokes, data.strokes);
  updateFaceMesh(surface.eyeFills, data.eyeFills);
  updateFaceMesh(surface.darkFills, data.darkFills);
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
    new THREE.SphereGeometry(0.34, 24, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
  );
  head.add(headMesh);
  const faceSurface = makeFaceSurface();
  updateFaceSurface(faceSurface, "calm", 0);
  head.add(faceSurface.group);
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
  group.userData.faceSurface = faceSurface;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.dialogue = dialogue;
  group.userData.humanAvatar = undefined;
  return group;
}

function spiderLegSegment(length: number, radius: number, side: SpiderLegSide, material: THREE.Material) {
  const segment = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 7),
    material,
  );
  segment.rotation.z = side * -Math.PI / 2;
  segment.position.x = side * length / 2;
  return segment;
}

function makeAnimatedSpider() {
  const spider = new THREE.Group();
  spider.name = "viewer-facing-animated-spider";
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b160f,
    roughness: 0.98,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x160b08,
    roughness: 0.92,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const markingMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d3c26,
    roughness: 1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0x9e351e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), bodyMaterial);
  abdomen.scale.set(1.02, 0.52, 1.3);
  abdomen.position.set(0, 0.39, -0.32);
  spider.add(abdomen);
  for (const z of [-0.28, -0.48]) {
    const marking = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 5, 24), markingMaterial);
    marking.scale.y = 0.5;
    marking.position.set(0, 0.4, z);
    spider.add(marking);
  }

  const cephalothorax = new THREE.Mesh(new THREE.SphereGeometry(0.37, 22, 16), bodyMaterial);
  cephalothorax.scale.set(1, 0.66, 1.12);
  cephalothorax.position.set(0, 0.38, 0.38);
  spider.add(cephalothorax);

  const legRigs: SpiderLegRig[] = [];
  const jointGeometry = new THREE.SphereGeometry(0.072, 9, 7);
  for (const side of [-1, 1] as const) {
    for (let pair = 0; pair < 4; pair += 1) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.2, 0.37, [0.34, 0.12, -0.12, -0.34][pair]);
      hip.add(spiderLegSegment(0.19, 0.06, side, legMaterial));

      const knee = new THREE.Group();
      knee.position.x = side * 0.19;
      knee.add(new THREE.Mesh(jointGeometry, legMaterial));
      knee.add(spiderLegSegment(0.52, 0.058, side, legMaterial));
      hip.add(knee);

      const ankle = new THREE.Group();
      ankle.position.x = side * 0.52;
      ankle.add(new THREE.Mesh(jointGeometry, legMaterial));
      ankle.add(spiderLegSegment(0.62, 0.044, side, legMaterial));
      knee.add(ankle);

      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), legMaterial);
      foot.scale.set(1.5, 0.65, 1);
      foot.position.x = side * 0.62;
      ankle.add(foot);
      spider.add(hip);
      legRigs.push({ side, pair: pair as 0 | 1 | 2 | 3, hip, knee, ankle });
    }
  }

  const mandibles: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const mandible = new THREE.Group();
    mandible.position.set(side * 0.11, 0.31, 0.7);
    const fang = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 7), legMaterial);
    fang.rotation.x = Math.PI / 2;
    fang.position.z = 0.08;
    mandible.add(fang);
    spider.add(mandible);
    mandibles.push(mandible);
  }

  for (const [x, y, z, radius] of [
    [-0.09, 0.44, 0.75, 0.038], [0.09, 0.44, 0.75, 0.038],
    [-0.2, 0.41, 0.69, 0.028], [0.2, 0.41, 0.69, 0.028],
    [-0.145, 0.5, 0.68, 0.023], [0.145, 0.5, 0.68, 0.023],
  ] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius, 9, 7), eyeMaterial);
    eye.position.set(x, y, z);
    spider.add(eye);
  }

  spider.scale.setScalar(1.02);
  spider.visible = false;
  spider.userData.legs = legRigs;
  spider.userData.mandibles = mandibles;
  spider.userData.materials = [bodyMaterial, legMaterial, markingMaterial, eyeMaterial];
  return spider;
}

function makeThreat() {
  const root = new THREE.Group();

  const shadow = new THREE.Group();
  const cloakMaterial = new THREE.MeshStandardMaterial({ color: 0x030308, roughness: 1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.82, 1.9, 18, 1, true),
    cloakMaterial,
  );
  cloak.position.y = 0.88;
  shadow.add(cloak);
  const hoodMaterial = new THREE.MeshStandardMaterial({ color: 0x020207, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 18, 12),
    hoodMaterial,
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
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3c32, transparent: true, opacity: 0, depthWrite: false });
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

  const spider = makeAnimatedSpider();
  root.add(spider);
  root.userData.shadow = shadow;
  root.userData.aura = aura;
  root.userData.cloakMaterial = cloakMaterial;
  root.userData.hoodMaterial = hoodMaterial;
  root.userData.eyeMaterial = eyeMaterial;
  root.userData.angryAgent = angryAgent;
  root.userData.spider = spider;
  root.userData.spiderMaterials = spider.userData.materials;
  return root;
}

interface ForestMaterials {
  bark: THREE.MeshStandardMaterial;
  barkLight: THREE.MeshStandardMaterial;
  broadleaf: readonly THREE.MeshStandardMaterial[];
  broadleafAccent: readonly THREE.MeshStandardMaterial[];
  pine: readonly THREE.MeshStandardMaterial[];
  pineAccent: readonly THREE.MeshStandardMaterial[];
  undergrowth: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
}

function makeForestMaterials(): ForestMaterials {
  const foliage = (color: number) => new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  return {
    bark: new THREE.MeshStandardMaterial({ color: 0x3f3027, roughness: 1, flatShading: true }),
    barkLight: new THREE.MeshStandardMaterial({ color: 0x614938, roughness: 1, flatShading: true }),
    broadleaf: [foliage(0x17483a), foliage(0x205541), foliage(0x285f46)],
    broadleafAccent: [foliage(0x28614a), foliage(0x337052), foliage(0x3a7753)],
    pine: [foliage(0x103c34), foliage(0x17483b), foliage(0x1d5140)],
    pineAccent: [foliage(0x1d5645), foliage(0x27614a), foliage(0x2d6950)],
    undergrowth: foliage(0x214a37),
    stone: new THREE.MeshStandardMaterial({ color: 0x46534a, roughness: 1, flatShading: true }),
  };
}

function makeForestBranch(
  length: number,
  radius: number,
  material: THREE.Material,
  yaw: number,
  lean: number,
) {
  const pivot = new THREE.Group();
  pivot.rotation.set(0, yaw, lean);
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius, length, 7), material);
  branch.position.y = length / 2;
  pivot.add(branch);
  return pivot;
}

function makeForestTree(treeState: ForestTree, materials: ForestMaterials) {
  const tree = new THREE.Group();
  tree.name = `forest-tree-${treeState.id}`;
  tree.position.set(treeState.x, 0, treeState.z);
  tree.rotation.y = treeState.rotation;
  tree.scale.setScalar(treeState.scale);

  const pine = treeState.species === "pine";
  const trunkHeight = pine ? 3.15 : 2.65;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(pine ? 0.12 : 0.17, pine ? 0.2 : 0.28, trunkHeight, 9),
    materials.bark,
  );
  trunk.position.y = trunkHeight / 2;
  tree.add(trunk);

  for (let rootIndex = 0; rootIndex < 3; rootIndex += 1) {
    const rootAngle = rootIndex * (Math.PI * 2 / 3) + 0.35;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.68, 6), materials.barkLight);
    root.scale.set(0.55, 1, 0.75);
    root.rotation.z = Math.PI / 2;
    root.rotation.y = rootAngle;
    root.position.set(Math.cos(rootAngle) * 0.22, 0.08, Math.sin(rootAngle) * 0.22);
    tree.add(root);
  }

  if (pine) {
    const baseMaterial = materials.pine[treeState.tone];
    const accentMaterial = materials.pineAccent[treeState.tone];
    const tiers = [
      { y: 1.35, radius: 1, height: 1.48 },
      { y: 1.9, radius: 0.84, height: 1.38 },
      { y: 2.43, radius: 0.66, height: 1.25 },
      { y: 2.9, radius: 0.46, height: 1.05 },
    ];
    for (let index = 0; index < tiers.length; index += 1) {
      const tier = tiers[index];
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(tier.radius, tier.height, 10),
        index % 2 ? accentMaterial : baseMaterial,
      );
      crown.position.y = tier.y;
      crown.rotation.y = index * 0.57;
      crown.scale.x = 0.92 + (index % 3) * 0.06;
      tree.add(crown);
    }
    const branch = makeForestBranch(0.72, 0.055, materials.barkLight, 0.7, -0.86);
    branch.position.y = 1.05;
    tree.add(branch);
  } else {
    const baseMaterial = materials.broadleaf[treeState.tone];
    const accentMaterial = materials.broadleafAccent[treeState.tone];
    for (const [yaw, lean, y, length] of [
      [0.2, -0.72, 1.35, 1],
      [2.3, 0.68, 1.52, 0.9],
      [4.4, -0.61, 1.7, 0.82],
    ] as const) {
      const branch = makeForestBranch(length, 0.085, materials.barkLight, yaw, lean);
      branch.position.y = y;
      tree.add(branch);
    }
    const clusters = [
      { x: 0, y: 2.55, z: 0, scale: 0.98 },
      { x: -0.58, y: 2.38, z: 0.08, scale: 0.74 },
      { x: 0.58, y: 2.43, z: 0.13, scale: 0.78 },
      { x: -0.12, y: 2.5, z: -0.58, scale: 0.76 },
      { x: 0.12, y: 3.08, z: -0.04, scale: 0.68 },
    ];
    for (let index = 0; index < clusters.length; index += 1) {
      const cluster = clusters[index];
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.82, 0),
        index % 2 ? accentMaterial : baseMaterial,
      );
      crown.position.set(cluster.x, cluster.y, cluster.z);
      crown.scale.set(cluster.scale * (index % 3 === 0 ? 1.12 : 1), cluster.scale, cluster.scale * (index % 2 ? 0.94 : 1.08));
      crown.rotation.set(index * 0.17, index * 0.61, index * -0.11);
      tree.add(crown);
    }
  }

  for (const side of [-1, 1]) {
    const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.27, 0), materials.undergrowth);
    shrub.position.set(side * (0.42 + treeState.tone * 0.08), 0.18, side * -0.19);
    shrub.scale.set(1.25, 0.7 + treeState.tone * 0.08, 1);
    shrub.rotation.y = side * 0.7;
    tree.add(shrub);
  }
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), materials.stone);
  stone.position.set(0.34, 0.11, -0.31);
  stone.scale.set(1.35, 0.65, 1);
  stone.rotation.set(0.14, 0.35, -0.08);
  tree.add(stone);
  return tree;
}

function makeBatchedForest(materials: ForestMaterials) {
  const source = new THREE.Group();
  for (const treeState of FOREST_TREES) source.add(makeForestTree(treeState, materials));
  source.updateMatrixWorld(true);

  const geometryByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const collection = geometryByMaterial.get(object.material) ?? [];
    collection.push(geometry);
    geometryByMaterial.set(object.material, collection);
    object.geometry.dispose();
  });

  const forest = new THREE.Group();
  forest.name = "batched-procedural-forest";
  let batchIndex = 0;
  for (const [material, geometries] of geometryByMaterial) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error("Forest geometry attributes could not be merged.");
    const batch = new THREE.Mesh(merged, material);
    batch.name = `forest-material-batch-${batchIndex}`;
    batch.frustumCulled = true;
    forest.add(batch);
    batchIndex += 1;
  }
  return forest;
}

const XrScene = forwardRef<XrSceneHandle, XrSceneProps>(function XrScene(
  { snapshot, visible, audioEngine, onFrame, onReady, onStartRequest, onPauseRequest, onSessionChange, onStatus },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(snapshot);
  const frameRef = useRef(onFrame);
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
  const enterInFlightRef = useRef<Promise<void> | null>(null);
  const textureCache = useRef(new Map<string, THREE.Texture>());

  useEffect(() => { stateRef.current = snapshot; }, [snapshot]);
  useEffect(() => { frameRef.current = onFrame; }, [onFrame]);
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
    scene.fog = passthrough ? null : (scene.userData.virtualFog as THREE.FogExp2 | undefined) ?? null;
    if (environmentRef.current) environmentRef.current.visible = !passthrough;
    renderer.setClearColor(passthrough ? 0x000000 : 0x071c18, passthrough ? 0 : 1);
  }

  useImperativeHandle(ref, () => ({
    async enter(mode: SceneMode) {
      const renderer = rendererRef.current;
      if (!renderer || !navigator.xr) throw new Error("Immersive WebXR is not available in this browser.");
      if (enterInFlightRef.current) return enterInFlightRef.current;
      const previousMode = activeModeRef.current;
      applyMode(mode);
      const sessionMode: XRSessionMode = mode === "passthrough" ? "immersive-ar" : "immersive-vr";
      const options: XRSessionInit = {
        requiredFeatures: ["local-floor"],
        optionalFeatures: mode === "passthrough" ? ["layers", "dom-overlay"] : ["layers"],
      };
      if (mode === "passthrough") (options as XRSessionInit & { domOverlay: { root: Element } }).domOverlay = { root: document.body };
      onStatus(`Requesting ${mode === "passthrough" ? "mixed reality" : "virtual reality"}…`);
      const sessionRequest = navigator.xr.requestSession(sessionMode, options);
      const entry = (async () => {
        const session = await sessionRequest;
        try {
          renderer.xr.setReferenceSpaceType("local-floor");
          await renderer.xr.setSession(session);
        } catch (error) {
          try {
            await session.end();
          } catch {
            // Best-effort cleanup preserves the original renderer setup error.
          }
          throw error;
        }
      })();
      enterInFlightRef.current = entry;
      try {
        await entry;
      } catch (error) {
        applyMode(previousMode);
        throw error;
      } finally {
        if (enterInFlightRef.current === entry) enterInFlightRef.current = null;
      }
    },
    async exit() {
      await rendererRef.current?.xr.getSession()?.end();
    },
  }), [onStatus]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const cachedTextures = textureCache.current;
    const agents = agentRefs.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 60);
    camera.position.set(0, 3.3, 6.8);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onReady(false);
      onStatus("The 3D preview needs a browser with WebGL enabled; the planar top-down monitor remains available.");
      return;
    }
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
    environment.name = "corridor-cleared-forest";
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(24, 64),
      new THREE.MeshStandardMaterial({ color: 0x183d32, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    environment.add(floor);
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(3.9, 18.6),
      new THREE.MeshStandardMaterial({ color: 0x29483b, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -0.012, -8.1);
    environment.add(path);

    const forestMaterials = makeForestMaterials();
    environment.add(makeBatchedForest(forestMaterials));
    scene.userData.virtualFog = new THREE.FogExp2(0x071c18, 0.022);
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

    const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const loader = new GLTFLoader();
    loader.load(`${assetBase}/assets/models/cesium-man.glb`, (gltf) => {
      if (disposed) return;
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 1.72 / Math.max(0.01, size.y);
      for (const agent of agentRefs.current.values()) {
        const avatar = cloneSkeleton(gltf.scene);
        avatar.scale.setScalar(scale);
        avatar.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        avatar.visible = false;
        avatar.traverse((object) => { object.frustumCulled = false; });
        agent.add(avatar);
        agent.userData.humanAvatar = avatar;
      }
    }, undefined, () => {
      if (!disposed) onStatus("The human avatar asset did not load; minimal agents remain available.");
    });
    for (let index = 0; index < 2; index += 1) {
      const controller = renderer.xr.getController(index);
      controller.addEventListener("select", () => pauseRef.current());
      scene.add(controller);
    }

    renderer.xr.addEventListener("sessionstart", () => {
      controls.enabled = false;
      camera.position.set(0, 0, 0);
      onSessionChange(true, activeModeRef.current);
      onStatus("Immersive scene ready and trial clock running. A restarts/resumes; either trigger pauses.");
    });
    renderer.xr.addEventListener("sessionend", () => {
      camera.position.set(0, 3.3, 6.8);
      controls.enabled = !coarsePointer;
      controls.target.set(0, 1.1, -1.5);
      applyMode(stateRef.current.config.mode);
      onSessionChange(false);
      onStatus("Immersive session ended; the browser scene and trial clock remain available.");
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
    onReady(true);

    const listenerPosition = new THREE.Vector3();
    const listenerQuaternion = new THREE.Quaternion();
    const listenerForward = new THREE.Vector3();
    const listenerUp = new THREE.Vector3();
    let rightAWasPressed = false;

    renderer.setAnimationLoop((time) => {
      if (renderer.xr.isPresenting) frameRef.current(time);
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
        const motionEnergy = THREE.MathUtils.clamp(agentState.locomotion, 0, 1);
        const moving = motionEnergy > 0.025;
        const bob = moving ? Math.abs(gaitWave) * (0.012 + motionEnergy * 0.055) : 0;
        agent.position.set(agentState.x, bob, agentState.z);
        agent.rotation.y = agentState.yaw;
        const humanAvatar = agent.userData.humanAvatar as THREE.Group | undefined;
        const showHuman = state.config.agentStyle === "human" && Boolean(humanAvatar);
        (agent.userData.body as THREE.Object3D).visible = !showHuman;
        (agent.userData.head as THREE.Object3D).visible = !showHuman;
        (agent.userData.leftArm as THREE.Object3D).visible = !showHuman;
        (agent.userData.rightArm as THREE.Object3D).visible = !showHuman;
        if (humanAvatar) {
          humanAvatar.visible = showHuman;
          humanAvatar.rotation.x = -agentState.avoidance * motionEnergy * 0.055;
          humanAvatar.rotation.z = agentState.behavior === "startle"
            ? Math.sin(time * 0.018) * 0.035 * agentState.awareness
            : 0;
        }
        const faceSurface = agent.userData.faceSurface as FaceSurface | undefined;
        if (faceSurface) updateFaceSurface(faceSurface, agentState.expression, agentState.fear);
        const leftArm = agent.userData.leftArm as THREE.Group;
        const rightArm = agent.userData.rightArm as THREE.Group;
        const head = agent.userData.head as THREE.Group;
        leftArm.rotation.x = moving ? gaitWave * 0.62 * motionEnergy : agentState.behavior === "startle" ? -0.72 * agentState.awareness : 0;
        rightArm.rotation.x = moving ? -gaitWave * 0.62 * motionEnergy : agentState.behavior === "startle" ? -0.72 * agentState.awareness : 0;
        rightArm.rotation.z = agentState.behavior === "talk" ? -0.36 - Math.sin(agentState.gesture * Math.PI * 2) * 0.2 : 0;
        leftArm.rotation.z = agentState.behavior === "startle" ? 0.52 * agentState.awareness : 0;
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
        threat.rotation.y = threatState.yaw;
        const shadow = threat.userData.shadow as THREE.Group;
        const angryAgent = threat.userData.angryAgent as THREE.Group;
        const animatedSpider = threat.userData.spider as THREE.Group;
        const visibility = THREE.MathUtils.clamp(threatState.visibility, 0, 1);
        shadow.visible = threatState.kind === "shadow" && visibility > 0.005;
        angryAgent.visible = threatState.kind === "angry-agent";
        animatedSpider.visible = threatState.kind === "spider" && visibility > 0.005;
        const cloakMaterial = threat.userData.cloakMaterial as THREE.MeshStandardMaterial;
        const hoodMaterial = threat.userData.hoodMaterial as THREE.MeshStandardMaterial;
        const eyeMaterial = threat.userData.eyeMaterial as THREE.MeshBasicMaterial;
        cloakMaterial.opacity = visibility * 0.94;
        hoodMaterial.opacity = visibility * 0.98;
        eyeMaterial.opacity = THREE.MathUtils.smoothstep(visibility, 0.12, 0.92);
        for (const material of (threat.userData.spiderMaterials as THREE.Material[] | undefined) ?? []) material.opacity = visibility;
        if (angryAgent.visible) {
          updateFaceSurface(angryAgent.userData.faceSurface as FaceSurface, "angry", 1);
        }
        const spiderPose = spiderMotionPose(state.elapsedMs, state.phase, state.config.intensity);
        animatedSpider.position.y = spiderPose.bodyBob;
        animatedSpider.rotation.y = spiderPose.bodyYaw;
        const legRigs = animatedSpider.userData.legs as SpiderLegRig[];
        for (const leg of legRigs) {
          const pose = spiderPose.legs.find((item) => item.side === leg.side && item.pair === leg.pair)!;
          leg.hip.rotation.y = leg.side * pose.sweep;
          leg.hip.rotation.z = leg.side * (0.3 + pose.lift * 0.2);
          leg.knee.rotation.z = leg.side * (-0.58 + pose.kneeFlex);
          leg.ankle.rotation.z = leg.side * (-0.28 - pose.lift * 0.1);
        }
        for (const mandible of animatedSpider.userData.mandibles as THREE.Group[]) {
          const side = Math.sign(mandible.position.x);
          mandible.rotation.y = side * spiderPose.mandible;
        }
        const pulse = threatState.kind === "spider" ? 1 : 1.05 + Math.sin(time * 0.006) * 0.035;
        threat.scale.setScalar(pulse);
        const aura = threat.userData.aura as THREE.Mesh;
        (aura.material as THREE.MeshBasicMaterial).opacity = visibility * (0.13 + Math.sin(time * 0.0043) * 0.045);
      }
      if (renderer.xr.isPresenting && audioRef.current?.enabled) {
        const xrCamera = renderer.xr.getCamera();
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
      disposed = true;
      onReady(false);
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
  }, [onReady, onSessionChange, onStatus]);

  useEffect(() => {
    if (!rendererRef.current?.xr.isPresenting) applyMode(snapshot.config.mode);
  }, [snapshot.config.mode]);

  useEffect(() => {
    if (!visible) return;
    const host = hostRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!host || !renderer || !camera || renderer.xr.isPresenting) return;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(rect.width, rect.height, false);
    };
    resize();
    const animationFrame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(animationFrame);
  }, [visible]);

  return <div ref={hostRef} className="xr-scene" aria-label="Interactive first-person preview of the social threat scenario" />;
});

export default XrScene;
