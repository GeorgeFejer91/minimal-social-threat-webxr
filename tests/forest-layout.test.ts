import assert from "node:assert/strict";
import test from "node:test";
import {
  FOREST_TREES,
  THREAT_CORRIDOR_HALF_WIDTH,
  forestTreeCanopyRadius,
  forestTreeCorridorClearance,
} from "../lib/forest-layout.ts";

test("forest layout contains varied trees on both sides of the approach", () => {
  assert.ok(FOREST_TREES.length >= 24);
  assert.ok(FOREST_TREES.some((tree) => tree.species === "broadleaf"));
  assert.ok(FOREST_TREES.some((tree) => tree.species === "pine"));
  assert.ok(FOREST_TREES.some((tree) => tree.x < 0));
  assert.ok(FOREST_TREES.some((tree) => tree.x > 0));
  assert.equal(new Set(FOREST_TREES.map((tree) => tree.id)).size, FOREST_TREES.length);
});

test("every full tree canopy clears the threat corridor", () => {
  for (const tree of FOREST_TREES) {
    assert.ok(
      forestTreeCorridorClearance(tree) >= 0,
      `${tree.id}: |${tree.x}| - canopy ${forestTreeCanopyRadius(tree)} must clear ±${THREAT_CORRIDOR_HALF_WIDTH} m`,
    );
  }
});
