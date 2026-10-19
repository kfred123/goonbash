import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_CANNON_MUZZLE_DISTANCE, Base, GameState, getBaseCannonMuzzlePosition, Minion, Tower } from "shared";
import {
  applyDamage,
  clampToBounds,
  createShotProjectile,
  findNearestEnemyInRange,
  getLivingTowers,
  hasDied,
  hasProjectileReachedTarget,
  isReadyToRespawn,
  isWithinRange,
  nearBasePosition,
  respawnTank,
  stepToward,
  stepHomingProjectile,
  stepProjectileTowardTarget,
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

test("homing projectiles steer toward the target's current position and stop at impact", () => {
  assert.deepEqual(stepProjectileTowardTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 450, 0.1), { x: 45, y: 0 });
  assert.deepEqual(stepProjectileTowardTarget({ x: 45, y: 0 }, { x: 45, y: 100 }, 450, 0.1), { x: 45, y: 45 });
  assert.deepEqual(stepProjectileTowardTarget({ x: 0, y: 0 }, { x: 10, y: 0 }, 450, 0.1), { x: 10, y: 0 });
});

test("homing projectile tracks a moving target, reports impact once, and removes lost targets without retargeting", () => {
  const first = stepHomingProjectile({ x: 0, y: 0 }, { x: 100, y: 0 }, 450, 0.1, 12);
  assert.deepEqual(first, { status: "flying", position: { x: 45, y: 0 } });

  const movedTarget = stepHomingProjectile(first.position, { x: 45, y: 100 }, 450, 0.1, 12);
  assert.deepEqual(movedTarget, { status: "flying", position: { x: 45, y: 45 } });

  const impact = stepHomingProjectile(movedTarget.position, { x: 45, y: 50 }, 450, 0.1, 12);
  assert.equal(impact.status, "impact");
  if (impact.status === "impact") assert.deepEqual(impact.position, { x: 45, y: 50 });

  assert.deepEqual(stepHomingProjectile(impact.status === "impact" ? impact.position : movedTarget.position, undefined, 450, 0.1, 12), {
    status: "target-lost"
  });
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

test("lane tower shots preserve tower damage and replicate the firing direction", () => {
  const tower = new Tower();
  tower.id = "blue-tower";
  tower.team = "blue";
  tower.y = 10;
  const target = { id: "enemy", x: 0, y: 110, team: "red" };

  const projectile = createShotProjectile(tower, target, "tower-shot");

  assert.equal(projectile.damage, 12);
  assert.ok(Math.abs(projectile.x) < 1e-9);
  assert.equal(projectile.y, 31);
  assert.equal(tower.shotCount, 1);
  assert.equal(tower.shotAngle, Math.PI / 2);
});

test("a main base fires at the nearest enemy within range using its stronger shot and cooldown", () => {
  const base = new Base();
  base.id = "blue-base";
  base.team = "blue";
  base.x = 0;
  base.y = 0;
  const nearestEnemy = { id: "near-enemy", x: 100, y: 0, team: "red" };
  const fartherEnemy = { id: "far-enemy", x: 200, y: 0, team: "red" };
  const friendly = { id: "friendly", x: 10, y: 0, team: "blue" };
  const fired: Array<{ targetId: string; damage: number; origin: { x: number; y: number } }> = [];

  const fire = (shooter: Base, target: { id: string; x: number; y: number }) => {
    fired.push({
      targetId: target.id,
      damage: shooter.fireDamage,
      origin: getBaseCannonMuzzlePosition(shooter, target)
    });
  };

  assert.equal(tickShooter(base, [fartherEnemy, friendly, nearestEnemy], 0, fire)?.id, "near-enemy");
  assert.equal(base.targetId, "near-enemy");
  assert.equal(base.fireCooldown, 1200);
  assert.deepEqual(fired, [{
    targetId: "near-enemy",
    damage: 24,
    origin: { x: BASE_CANNON_MUZZLE_DISTANCE, y: 0 }
  }]);

  assert.equal(tickShooter(base, [nearestEnemy], 1199, fire), null);
  assert.equal(base.fireCooldown, 1);
  assert.equal(tickShooter(base, [nearestEnemy], 1, fire)?.id, "near-enemy");
  assert.equal(fired.length, 2);
});

test("a main base does not fire at enemies beyond its range and clears its target", () => {
  const base = new Base();
  base.team = "blue";
  base.targetId = "old-target";
  let shots = 0;

  assert.equal(tickShooter(base, [{ id: "distant-enemy", x: 251, y: 0, team: "red" }], 16, () => shots++), null);
  assert.equal(base.targetId, "");
  assert.equal(shots, 0);
});

test("a close-range base shot retains replicated firing feedback after impact in its spawning update", () => {
  const state = new GameState();
  const base = new Base();
  base.id = "blue-base";
  base.team = "blue";
  state.bases.set(base.id, base);
  const enemy = new Minion();
  enemy.id = "enemy";
  enemy.team = "red";
  enemy.y = 50;
  state.minions.set(enemy.id, enemy);

  const client = new GameState();
  client.decode(state.encodeAll());
  state.discardAllChanges();

  tickShooter(base, [enemy], 1000 / 60, (shooter, target) => {
    const projectile = createShotProjectile(shooter, target, "close-shot");
    state.projectiles.set(projectile.id, projectile);
    const next = stepProjectileTowardTarget(projectile, target, projectile.speed, 1 / 60);
    projectile.x = next.x;
    projectile.y = next.y;
    assert.equal(hasProjectileReachedTarget(next.x, next.y, target.x, target.y, 12), true);
    enemy.hp = applyDamage(enemy.hp, projectile.damage);
    state.projectiles.delete(projectile.id);
  });
  base.targetId = "";
  state.minions.delete(enemy.id);
  client.decode(state.encode());

  assert.equal(client.projectiles.size, 0);
  const clientBase = client.bases.get(base.id);
  assert.ok(clientBase);
  assert.equal(clientBase.shotCount, 1);
  assert.equal(clientBase.shotAngle, Math.PI / 2);
  assert.equal(clientBase.targetId, "");
  assert.equal(client.minions.size, 0);
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

test("destroyed towers and cannon firing feedback remain in replicated state", () => {
  const state = new GameState();
  const tower = new Tower();
  tower.id = "destroyed-tower";
  tower.hp = 0;
  tower.shotCount = 3;
  tower.shotAngle = Math.PI / 2;
  state.towers.set(tower.id, tower);

  const client = new GameState();
  client.decode(state.encodeAll());
  const replicatedTower = client.towers.get(tower.id);

  assert.ok(replicatedTower);
  assert.equal(replicatedTower.hp, 0);
  assert.equal(replicatedTower.shotCount, 3);
  assert.equal(replicatedTower.shotAngle, Math.PI / 2);
});
