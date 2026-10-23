import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_CANNON_MUZZLE_DISTANCE, getBaseCannonAimAngle, getBaseCannonMuzzlePosition } from "./baseCannon.js";
import { TOWER_CANNON_MUZZLE_DISTANCE } from "./towerCannon.js";

test("base cannon aims toward its target", () => {
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: 10, y: 0 }), 0);
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: 0, y: 10 }), Math.PI / 2);
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: -10, y: 0 }), Math.PI);
});

test("scaled structure muzzle distances remain linear in every firing direction", () => {
  assert.ok(Math.abs(BASE_CANNON_MUZZLE_DISTANCE - 43.2) < 1e-9);
  assert.ok(Math.abs(TOWER_CANNON_MUZZLE_DISTANCE - 25.2) < 1e-9);
  const origin = { x: 240, y: 900 };
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]) {
    const target = { x: origin.x + Math.cos(angle) * 200, y: origin.y + Math.sin(angle) * 200 };
    const muzzle = getBaseCannonMuzzlePosition(origin, target);
    assert.ok(Math.abs(Math.hypot(muzzle.x - origin.x, muzzle.y - origin.y) - 43.2) < 1e-9);
  }
});

test("base cannon muzzle is offset from its center along the firing direction", () => {
  assert.deepEqual(
    getBaseCannonMuzzlePosition({ x: 100, y: 200 }, { x: 100, y: 300 }),
    { x: 100, y: 200 + BASE_CANNON_MUZZLE_DISTANCE }
  );
});
