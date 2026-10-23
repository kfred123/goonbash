import assert from "node:assert/strict";
import { test } from "node:test";
import { Tank } from "./state/Tank.js";
import { ABILITY_IDS } from "./abilities.js";

test("Tank initializes with progression defaults and all abilities locked", () => {
  const tank = new Tank();
  assert.equal(tank.level, 1);
  assert.equal(tank.xp, 0);
  assert.equal(tank.skillPoints, 0);
  assert.equal(tank.abilities.size, ABILITY_IDS.length);
  tank.abilities.forEach((ability) => assert.equal(ability.level, 0));
});
