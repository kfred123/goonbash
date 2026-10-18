import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_CANNON_MUZZLE_DISTANCE, getBaseCannonAimAngle, getBaseCannonMuzzlePosition } from "./baseCannon.js";

test("base cannon aims toward its target", () => {
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: 10, y: 0 }), 0);
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: 0, y: 10 }), Math.PI / 2);
  assert.equal(getBaseCannonAimAngle({ x: 0, y: 0 }, { x: -10, y: 0 }), Math.PI);
});

test("base cannon muzzle is offset from its center along the firing direction", () => {
  assert.deepEqual(
    getBaseCannonMuzzlePosition({ x: 100, y: 200 }, { x: 100, y: 300 }),
    { x: 100, y: 200 + BASE_CANNON_MUZZLE_DISTANCE }
  );
});
