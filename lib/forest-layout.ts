export type ForestTreeSpecies = "broadleaf" | "pine";

export interface ForestTree {
  id: string;
  x: number;
  z: number;
  scale: number;
  rotation: number;
  species: ForestTreeSpecies;
  tone: 0 | 1 | 2;
}

/** The entire threat, including the articulated spider's legs, stays inside this lane. */
export const THREAT_CORRIDOR_HALF_WIDTH = 2.4;

/**
 * A deterministic forest edge around the front-facing scene. Every crown stays
 * outside the central approach lane so no threat can intersect or visually pass
 * through a tree. Positions are project-authored stimulus geometry, not scenery RNG.
 */
export const FOREST_TREES: readonly ForestTree[] = [
  { id: "l01", x: -5.9, z: -3.7, scale: 0.92, rotation: 0.18, species: "broadleaf", tone: 1 },
  { id: "l02", x: -8.4, z: -4.9, scale: 1.12, rotation: -0.42, species: "pine", tone: 0 },
  { id: "l03", x: -6.7, z: -6.7, scale: 0.96, rotation: 0.54, species: "pine", tone: 2 },
  { id: "l04", x: -4.4, z: -8.0, scale: 0.94, rotation: -0.16, species: "broadleaf", tone: 0 },
  { id: "l05", x: -8.8, z: -8.8, scale: 1.24, rotation: 0.31, species: "broadleaf", tone: 2 },
  { id: "l06", x: -6.2, z: -10.3, scale: 1.08, rotation: -0.63, species: "broadleaf", tone: 1 },
  { id: "l07", x: -3.7, z: -11.7, scale: 0.92, rotation: 0.24, species: "pine", tone: 1 },
  { id: "l08", x: -8.1, z: -12.6, scale: 1.23, rotation: 0.72, species: "pine", tone: 0 },
  { id: "l09", x: -5.3, z: -14.1, scale: 1.14, rotation: -0.28, species: "broadleaf", tone: 2 },
  { id: "l10", x: -3.6, z: -15.8, scale: 0.88, rotation: 0.49, species: "broadleaf", tone: 1 },
  { id: "l11", x: -7.3, z: -16.8, scale: 1.35, rotation: -0.57, species: "pine", tone: 2 },
  { id: "l12", x: -4.5, z: -18.2, scale: 1.06, rotation: 0.12, species: "pine", tone: 0 },
  { id: "l13", x: -9.5, z: -18.7, scale: 1.28, rotation: 0.64, species: "broadleaf", tone: 0 },
  { id: "l14", x: -6.3, z: -20.4, scale: 1.16, rotation: -0.35, species: "broadleaf", tone: 1 },
  { id: "r01", x: 6.1, z: -3.3, scale: 0.9, rotation: -0.27, species: "pine", tone: 1 },
  { id: "r02", x: 8.6, z: -4.6, scale: 1.17, rotation: 0.46, species: "broadleaf", tone: 2 },
  { id: "r03", x: 6.9, z: -6.4, scale: 1.02, rotation: -0.58, species: "broadleaf", tone: 0 },
  { id: "r04", x: 4.2, z: -7.7, scale: 0.91, rotation: 0.22, species: "pine", tone: 2 },
  { id: "r05", x: 9.0, z: -8.4, scale: 1.29, rotation: -0.48, species: "pine", tone: 1 },
  { id: "r06", x: 6.4, z: -10.1, scale: 1.1, rotation: 0.34, species: "broadleaf", tone: 1 },
  { id: "r07", x: 3.8, z: -11.3, scale: 0.9, rotation: -0.19, species: "broadleaf", tone: 0 },
  { id: "r08", x: 8.3, z: -12.1, scale: 1.26, rotation: 0.59, species: "broadleaf", tone: 2 },
  { id: "r09", x: 5.5, z: -13.9, scale: 1.12, rotation: -0.71, species: "pine", tone: 0 },
  { id: "r10", x: 3.7, z: -15.4, scale: 0.9, rotation: 0.41, species: "pine", tone: 1 },
  { id: "r11", x: 7.6, z: -16.5, scale: 1.31, rotation: -0.32, species: "broadleaf", tone: 0 },
  { id: "r12", x: 4.7, z: -18.0, scale: 1.08, rotation: 0.67, species: "broadleaf", tone: 2 },
  { id: "r13", x: 9.8, z: -18.4, scale: 1.3, rotation: -0.51, species: "pine", tone: 2 },
  { id: "r14", x: 6.6, z: -20.2, scale: 1.18, rotation: 0.29, species: "pine", tone: 1 },
] as const;

export function forestTreeCanopyRadius(tree: ForestTree) {
  return tree.scale * (tree.species === "broadleaf" ? 1.08 : 0.82);
}

export function forestTreeCorridorClearance(tree: ForestTree) {
  return Math.abs(tree.x) - forestTreeCanopyRadius(tree) - THREAT_CORRIDOR_HALF_WIDTH;
}
