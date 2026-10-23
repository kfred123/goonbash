import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveWorldDimensions, WORLD_DIMENSIONS, WORLD_SCALE } from "./worldScale.js";

test("defaults enlarge linear dimensions while reducing the clear border-to-border gap", () => {
  assert.deepEqual(WORLD_SCALE, { entity: 1.2, roadWidth: 1.38, grassGap: 0.9 });
  for (const [actual, expected] of [
    [WORLD_DIMENSIONS.roadWidth, 154.56], [WORLD_DIMENSIONS.borderWidth, 171.12],
    [WORLD_DIMENSIONS.playerSize, 48], [WORLD_DIMENSIONS.minionSize, 21.6],
    [WORLD_DIMENSIONS.grassGap, 563.4],
    ...WORLD_DIMENSIONS.laneRows.map((y, index) => [y, [165.48, 900, 1634.52][index]])
  ]) assert.ok(Math.abs(actual - expected) < 1e-9);
});

test("all baseline dimensions can be restored without cumulative scaling", () => {
  assert.deepEqual(deriveWorldDimensions({ entity: 1, roadWidth: 1, grassGap: 1 }), {
    roadWidth: 112, borderWidth: 124, grassGap: 626, laneRows: [150, 900, 1650],
    playerSize: 40, minionSize: 18
  });
  assert.deepEqual(deriveWorldDimensions(WORLD_SCALE), WORLD_DIMENSIONS);
});

test("entity, road and grass factors can be adjusted independently", () => {
  const entity = deriveWorldDimensions({ ...WORLD_SCALE, entity: 1.5 });
  assert.equal(entity.playerSize, 60);
  assert.equal(entity.minionSize, 27);
  assert.equal(entity.roadWidth, WORLD_DIMENSIONS.roadWidth);
  assert.deepEqual(entity.laneRows, WORLD_DIMENSIONS.laneRows);
  const road = deriveWorldDimensions({ ...WORLD_SCALE, roadWidth: 1.48 });
  assert.equal(road.playerSize, 48);
  assert.equal(road.grassGap, WORLD_DIMENSIONS.grassGap);
  for (let index = 1; index < 3; index += 1) {
    assert.ok(Math.abs(road.laneRows[index] - road.laneRows[index - 1] - road.borderWidth - 563.4) < 1e-9);
  }
  const grass = deriveWorldDimensions({ ...WORLD_SCALE, grassGap: 0.8 });
  assert.equal(grass.roadWidth, WORLD_DIMENSIONS.roadWidth);
  assert.equal(grass.playerSize, 48);
  assert.ok(Math.abs(grass.grassGap - 500.8) < 1e-9);
});

test("invalid factors and out-of-bounds geometry fail explicitly", () => {
  for (const name of ["entity", "roadWidth", "grassGap"] as const) {
    for (const value of [0, -1, NaN, Infinity, -Infinity]) {
      assert.throws(() => deriveWorldDimensions({ ...WORLD_SCALE, [name]: value }), /Invalid world scale/);
    }
  }
  for (const factors of [
    { ...WORLD_SCALE, grassGap: 2 }, { ...WORLD_SCALE, roadWidth: 10 },
    { ...WORLD_SCALE, entity: Number.MAX_VALUE }
  ]) assert.throws(() => deriveWorldDimensions(factors), /exceed arena bounds or numeric limits/);
});
