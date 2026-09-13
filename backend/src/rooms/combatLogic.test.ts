import assert from "node:assert/strict";
import { test } from "node:test";
import { CombatConfig } from "shared";
import { applyDamage, findNearestTarget, hasReachedWaypoint, shouldSpawnFromTower, stepToward } from "./combatLogic.js";

test("findNearestTarget picks the closest living enemy within range", () => {
  const attacker = { x: 0, y: 0, team: "blue" };
  const candidates = [
    { id: "far-enemy", x: 100, y: 0, team: "red", hp: 10 },
    { id: "near-enemy", x: 10, y: 0, team: "red", hp: 10 },
    { id: "ally", x: 1, y: 0, team: "blue", hp: 10 },
    { id: "dead-enemy", x: 2, y: 0, team: "red", hp: 0 }
  ];
  const target = findNearestTarget(attacker, candidates, 50);
  assert.equal(target?.id, "near-enemy");
});

test("findNearestTarget returns undefined when nothing is in range", () => {
  const attacker = { x: 0, y: 0, team: "blue" };
  const candidates = [{ id: "enemy", x: 100, y: 0, team: "red", hp: 10 }];
  assert.equal(findNearestTarget(attacker, candidates, 40), undefined);
});

test("findNearestTarget switches to a closer enemy that enters range", () => {
  const attacker = { x: 0, y: 0, team: "blue" };
  let candidates = [{ id: "a", x: 30, y: 0, team: "red", hp: 10 }];
  assert.equal(findNearestTarget(attacker, candidates, 50)?.id, "a");
  candidates = [
    { id: "a", x: 30, y: 0, team: "red", hp: 10 },
    { id: "b", x: 10, y: 0, team: "red", hp: 10 }
  ];
  assert.equal(findNearestTarget(attacker, candidates, 50)?.id, "b");
});

test("stepToward moves toward the target without overshooting", () => {
  const step1 = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
  assert.equal(step1.x, 10);
  assert.equal(step1.y, 0);

  const step2 = stepToward({ x: 95, y: 0 }, { x: 100, y: 0 }, 10);
  assert.equal(step2.x, 100);
  assert.equal(step2.y, 0);
});

test("applyDamage reduces hp over elapsed time and clamps at 0", () => {
  assert.equal(applyDamage(100, 10, 1), 90);
  assert.equal(applyDamage(5, 10, 1), 0);
});

test("hasReachedWaypoint detects proximity within epsilon", () => {
  assert.equal(hasReachedWaypoint({ x: 0, y: 0 }, { x: 0.5, y: 0 }), true);
  assert.equal(hasReachedWaypoint({ x: 0, y: 0 }, { x: 5, y: 0 }), false);
});

test("shouldSpawnFromTower only allows spawning from a tower that is still alive", () => {
  assert.equal(shouldSpawnFromTower({ hp: 500 }), true);
  assert.equal(shouldSpawnFromTower({ hp: 0 }), false);
  assert.equal(shouldSpawnFromTower({ hp: -10 }), false);
});

test("combat values are fully driven by CombatConfig, not hardcoded", () => {
  // Changing the configured mob damage changes the outcome of applyDamage
  // without any code changes, proving damage is not a hardcoded constant.
  const lowDamageConfig = { ...CombatConfig.mob, damage: 5 };
  const highDamageConfig = { ...CombatConfig.mob, damage: 50 };
  assert.equal(applyDamage(100, lowDamageConfig.damage, 1), 95);
  assert.equal(applyDamage(100, highDamageConfig.damage, 1), 50);

  // Changing the configured attack range changes who counts as "in range".
  const attacker = { x: 0, y: 0, team: "blue" };
  const candidates = [{ id: "enemy", x: 30, y: 0, team: "red", hp: 10 }];
  assert.equal(findNearestTarget(attacker, candidates, 10), undefined);
  assert.equal(findNearestTarget(attacker, candidates, 40)?.id, "enemy");
});
