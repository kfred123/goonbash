import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyDamage,
  findNearestEnemyInRange,
  hasDied,
  hasProjectileReachedTarget,
  isReadyToRespawn,
  isWithinRange,
  respawnTank,
  stepToward
} from "./combat.js";

test("finds the nearest enemy-team candidate within range", () => {
  const shooter = { x: 0, y: 0, team: "red" };
  const far = { id: "far", x: 90, y: 0, team: "blue" };
  const near = { id: "near", x: 30, y: 0, team: "blue" };
  assert.equal(findNearestEnemyInRange(shooter, [far, near], 150)?.id, "near");
});

test("never selects a friendly-team candidate, even if it is closer", () => {
  const shooter = { x: 0, y: 0, team: "red" };
  const friendlyClose = { id: "friendly", x: 5, y: 0, team: "red" };
  const enemyFar = { id: "enemy", x: 40, y: 0, team: "blue" };
  assert.equal(findNearestEnemyInRange(shooter, [friendlyClose, enemyFar], 150)?.id, "enemy");
});

test("ignores friendly units entirely when they are the only candidates", () => {
  const shooter = { x: 0, y: 0, team: "red" };
  const friendly = { id: "friendly", x: 5, y: 0, team: "red" };
  assert.equal(findNearestEnemyInRange(shooter, [friendly], 150), null);
});

test("returns null when no enemy is within range", () => {
  const shooter = { x: 0, y: 0, team: "red" };
  const distantEnemy = { id: "enemy", x: 500, y: 0, team: "blue" };
  assert.equal(findNearestEnemyInRange(shooter, [distantEnemy], 150), null);
});

test("detects a projectile hit once it is within the hit radius", () => {
  assert.equal(hasProjectileReachedTarget(0, 0, 5, 0, 10), true);
  assert.equal(hasProjectileReachedTarget(0, 0, 50, 0, 10), false);
});

test("treats zero or negative HP as died", () => {
  assert.equal(hasDied(0), true);
  assert.equal(hasDied(-5), true);
  assert.equal(hasDied(1), false);
});

test("is ready to respawn only once dead and the respawn delay elapsed", () => {
  assert.equal(isReadyToRespawn({ state: "dead", respawnAt: 1000 }, 1000), true);
  assert.equal(isReadyToRespawn({ state: "dead", respawnAt: 1000 }, 999), false);
  assert.equal(isReadyToRespawn({ state: "alive", respawnAt: 1000 }, 2000), false);
});

test("reduces HP by the damage amount and clamps it at zero", () => {
  assert.equal(applyDamage(50, 20), 30);
  assert.equal(applyDamage(10, 25), 0);
  assert.equal(applyDamage(0, 5), 0);
});

test("respawning a tank restores full HP and positions it at the given base", () => {
  const respawned = respawnTank(100, 80, 300);
  assert.deepEqual(respawned, { hp: 100, x: 80, y: 300, state: "alive", respawnAt: 0 });
});

test("a point within the given range is considered within range, inclusive of the boundary", () => {
  assert.equal(isWithinRange({ x: 0, y: 0 }, { x: 100, y: 0 }, 100), true);
  assert.equal(isWithinRange({ x: 0, y: 0 }, { x: 101, y: 0 }, 100), false);
});

test("stepToward moves a point partway toward a distant destination without overshooting", () => {
  const next = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 30);
  assert.equal(next.arrived, false);
  assert.equal(next.x, 30);
  assert.equal(next.y, 0);
});

test("stepToward snaps to the destination and reports arrival once within range in a single step", () => {
  const next = stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 30);
  assert.deepEqual(next, { x: 10, y: 0, arrived: true });
});

test("stepToward reports arrival immediately when already within the arrival epsilon", () => {
  const next = stepToward({ x: 99, y: 0 }, { x: 100, y: 0 }, 30);
  assert.deepEqual(next, { x: 100, y: 0, arrived: true });
});

test("stepToward keeps steering toward a moving destination's latest position", () => {
  const firstStep = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 30);
  const secondStep = stepToward({ x: firstStep.x, y: firstStep.y }, { x: 130, y: 0 }, 30);
  assert.equal(secondStep.x, 60);
  assert.equal(secondStep.arrived, false);
});
