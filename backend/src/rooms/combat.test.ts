import assert from "node:assert/strict";
import { test } from "node:test";
import { Minion, Tower } from "shared";
import {
  applyDamage,
  clampToBounds,
  findNearestEnemyInRange,
  getLivingTowers,
  hasDied,
  hasProjectileReachedTarget,
  isReadyToRespawn,
  isWithinRange,
  nearBasePosition,
  respawnTank,
  stepToward,
  tickShooter
} from "./combat.js";

const TEST_BOUNDS = { minX: 0, maxX: 2000, minY: 0, maxY: 2000 };

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

test("respawning a tank restores full HP and positions it near, but not exactly on, the base", () => {
  const respawned = respawnTank(100, 80, 300, TEST_BOUNDS);
  assert.equal(respawned.hp, 100);
  assert.equal(respawned.state, "alive");
  assert.equal(respawned.respawnAt, 0);
  const dx = respawned.x - 80;
  const dy = respawned.y - 300;
  const distance = Math.sqrt(dx * dx + dy * dy);
  assert.ok(distance >= 80 && distance <= 140, `expected distance ${distance} to be within the near-base radius`);
});

test("nearBasePosition stays within the near-base radius and within world bounds across repeated calls", () => {
  for (let i = 0; i < 50; i += 1) {
    const point = nearBasePosition(1000, 1000, TEST_BOUNDS);
    const dx = point.x - 1000;
    const dy = point.y - 1000;
    const distance = Math.sqrt(dx * dx + dy * dy);
    assert.ok(distance >= 80 && distance <= 140, `expected distance ${distance} to be within the near-base radius`);
    assert.ok(point.x >= TEST_BOUNDS.minX && point.x <= TEST_BOUNDS.maxX, "x within bounds");
    assert.ok(point.y >= TEST_BOUNDS.minY && point.y <= TEST_BOUNDS.maxY, "y within bounds");
  }

  // A base near the edge of the world should still produce a clamped, in-bounds point.
  const edgePoint = nearBasePosition(10, 10, TEST_BOUNDS);
  assert.ok(edgePoint.x >= TEST_BOUNDS.minX && edgePoint.x <= TEST_BOUNDS.maxX, "edge x within bounds");
  assert.ok(edgePoint.y >= TEST_BOUNDS.minY && edgePoint.y <= TEST_BOUNDS.maxY, "edge y within bounds");
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

test("clampToBounds leaves a point inside the bounds unchanged", () => {
  assert.deepEqual(clampToBounds({ x: 1200, y: 900 }, 60, 2340, 60, 1740), { x: 1200, y: 900 });
});

test("clampToBounds pulls a point back to the world-scale boundary on each axis", () => {
  assert.deepEqual(clampToBounds({ x: -50, y: 5000 }, 60, 2340, 60, 1740), { x: 60, y: 1740 });
  assert.deepEqual(clampToBounds({ x: 5000, y: -50 }, 60, 2340, 60, 1740), { x: 2340, y: 60 });
});

test("a lane tower fires at the nearest enemy and observes its cooldown", () => {
  const tower = new Tower();
  tower.id = "blue-tower";
  tower.team = "blue";
  tower.x = 0;
  tower.y = 0;
  const nearEnemy = new Minion();
  nearEnemy.id = "near-minion";
  nearEnemy.team = "red";
  nearEnemy.x = 80;
  nearEnemy.y = 0;
  const farEnemy = { id: "far-minion", team: "red", x: 150, y: 0 };
  const shots: string[] = [];
  const fire = (_shooter: Tower, target: { id: string }) => shots.push(target.id);

  assert.equal(tickShooter(tower, [farEnemy, nearEnemy], 16, fire)?.id, "near-minion");
  assert.deepEqual(shots, ["near-minion"]);
  assert.equal(tower.targetId, "near-minion");
  assert.equal(tower.fireCooldown, tower.fireCooldownMax);
  assert.equal(tickShooter(tower, [nearEnemy], 500, fire), null);
  assert.deepEqual(shots, ["near-minion"]);
});

test("destroyed towers are excluded from candidates while living towers remain targetable", () => {
  const livingTower = new Tower();
  livingTower.id = "living-tower";
  livingTower.team = "blue";
  livingTower.x = 100;
  const destroyedTower = new Tower();
  destroyedTower.id = "destroyed-tower";
  destroyedTower.team = "blue";
  destroyedTower.x = 10;
  destroyedTower.hp = 0;
  const candidates = getLivingTowers([livingTower, destroyedTower]);

  assert.deepEqual(candidates.map((tower) => tower.id), ["living-tower"]);
  assert.equal(findNearestEnemyInRange({ x: 0, y: 0, team: "red" }, candidates, 250)?.id, "living-tower");
});
