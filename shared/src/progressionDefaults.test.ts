import assert from "node:assert/strict";
import { test } from "node:test";
import { Tank } from "./state/Tank.js";

test("Tank initializes with progression defaults and all abilities locked", () => {
  const tank = new Tank();
  assert.equal(tank.level, 1);
  assert.equal(tank.xp, 0);
  assert.equal(tank.skillPoints, 0);
  assert.equal(tank.abilities.size, 6);
  tank.abilities.forEach((ability) => assert.equal(ability.level, 0));
});
