import assert from "node:assert/strict";
import { test } from "node:test";
import { Tank } from "./state/Tank.js";

test("Tank initializes with progression defaults: level 1, 0 xp, 0 skill points, 0 ability level", () => {
  const tank = new Tank();
  assert.equal(tank.level, 1);
  assert.equal(tank.xp, 0);
  assert.equal(tank.skillPoints, 0);
  assert.equal(tank.abilityLevel, 0);
});
