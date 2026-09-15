import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyDamage,
  findNearestEnemyInRange,
  hasDied,
  hasProjectileReachedTarget,
  isReadyToRespawn,
  respawnTank
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
