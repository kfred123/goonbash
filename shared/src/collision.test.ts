import assert from "node:assert/strict";
import { test } from "node:test";
import { Base, Minion, Tank, Tower } from "./index";
import { BASE_COLLISION_RADIUS, MINION_COLLISION_RADIUS, PLAYER_COLLISION_RADIUS, TOWER_COLLISION_RADIUS } from "./collision";
import { deriveWorldDimensions } from "./worldScale";

test("entity body radii are fixed world-space values, not visual or hit-test sizes", () => {
  const expected = [24, 11, 24, 48];
  const radii = () => [new Tank().radius, new Minion().radius, new Tower().radius, new Base().radius];
  assert.deepEqual([PLAYER_COLLISION_RADIUS, MINION_COLLISION_RADIUS, TOWER_COLLISION_RADIUS, BASE_COLLISION_RADIUS], expected);
  assert.deepEqual(radii(), expected);
  deriveWorldDimensions({ entity: 2, roadWidth: 1, grassGap: 0.9 });
  assert.deepEqual(radii(), expected);
  assert.ok(radii().every(radius => radius !== 12));
});
