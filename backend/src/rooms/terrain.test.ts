import assert from "node:assert/strict";
import { test } from "node:test";
import { stepToward } from "./combat.js";
import { effectiveMoveSpeed } from "./ability.js";
import { effectiveScoutTerrainMoveSpeed, effectiveTerrainMoveSpeed, terrainMovementMultiplier } from "./terrain.js";

test("grass applies a 50 percent movement speed penalty and stone lanes do not", () => {
  assert.equal(terrainMovementMultiplier({ x: 1200, y: 700 }), 0.5);
  assert.equal(terrainMovementMultiplier({ x: 1200, y: 900 }), 1);
  assert.equal(effectiveTerrainMoveSpeed(100, { x: 1200, y: 700 }), 50);
  assert.equal(effectiveTerrainMoveSpeed(100, { x: 1200, y: 900 }), 100);
});

test("grass penalty applies after the active Healer Speed multiplier", () => {
  const skillAdjustedSpeed = effectiveMoveSpeed(95, true, 1.15);
  assert.ok(Math.abs(effectiveTerrainMoveSpeed(skillAdjustedSpeed, { x: 1200, y: 700 }) - 54.625) < 1e-9);
  assert.ok(Math.abs(effectiveTerrainMoveSpeed(skillAdjustedSpeed, { x: 1200, y: 900 }) - 109.25) < 1e-9);
});

test("Scout Offroad speed boosts grass only and expires back to terrain-adjusted movement", () => {
  const grass = { x: 1200, y: 700 };
  const road = { x: 1200, y: 900 };
  assert.equal(effectiveScoutTerrainMoveSpeed(100, grass, true, 1.2), 60);
  assert.equal(effectiveScoutTerrainMoveSpeed(100, road, true, 1.2), 100);
  assert.equal(effectiveScoutTerrainMoveSpeed(100, grass, false, 1.2), 50);
  assert.equal(effectiveScoutTerrainMoveSpeed(100, grass, true, 1.65), 82.5);
});

test("terrain-adjusted movement steps advance at the expected grass and stone distances", () => {
  const grassStep = stepToward(
    { x: 1200, y: 700 },
    { x: 1300, y: 700 },
    effectiveTerrainMoveSpeed(100, { x: 1200, y: 700 })
  );
  const stoneStep = stepToward(
    { x: 1200, y: 900 },
    { x: 1300, y: 900 },
    effectiveTerrainMoveSpeed(100, { x: 1200, y: 900 })
  );
  assert.equal(grassStep.x - 1200, 50);
  assert.equal(stoneStep.x - 1200, 100);
});
