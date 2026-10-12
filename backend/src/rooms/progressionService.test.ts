import assert from "node:assert/strict";
import { test } from "node:test";
import {
  distributeKillXp,
  findEligibleTanksForKillXp,
  applyTankProgressionStats,
  purchaseAbilityUpgrade,
  ProgressionTank
} from "./progressionService.js";
import {
  KILL_XP_MINION,
  KILL_XP_PLAYER,
  KILL_XP_RADIUS,
  HP_PER_LEVEL,
  DAMAGE_PER_LEVEL,
  ROLE_STATS,
  MAX_ABILITY_LEVEL
} from "shared";

function createMockTank(partial: Partial<ProgressionTank> = {}): ProgressionTank {
  return {
    id: "tank-1",
    role: "tank",
    state: "alive",
    x: 0,
    y: 0,
    level: 1,
    xp: 0,
    skillPoints: 0,
    abilityLevel: 0,
    hp: ROLE_STATS.tank.maxHp,
    maxHp: ROLE_STATS.tank.maxHp,
    fireDamage: ROLE_STATS.tank.fireDamage,
    abilityCooldownMax: 18000,
    ...partial
  };
}

test("findEligibleTanksForKillXp selects only living tanks within radius", () => {
  const victimPos = { x: 100, y: 100 };
  const nearAlive = createMockTank({ id: "near-alive", x: 200, y: 100 }); // dist = 100
  const boundaryAlive = createMockTank({ id: "boundary", x: 100 + KILL_XP_RADIUS, y: 100 }); // dist = 500
  const outsideAlive = createMockTank({ id: "outside", x: 100 + KILL_XP_RADIUS + 1, y: 100 }); // dist = 501
  const nearDead = createMockTank({ id: "near-dead", x: 150, y: 100, state: "dead" });

  const eligible = findEligibleTanksForKillXp(victimPos, [nearAlive, boundaryAlive, outsideAlive, nearDead]);
  assert.deepEqual(eligible.map((t) => t.id), ["near-alive", "boundary"]);
});

test("distributeKillXp awards fixed minion XP (10) and player XP (50) regardless of team or damage", () => {
  const victimPos = { x: 0, y: 0 };
  const ally = createMockTank({ id: "ally", x: 50, y: 0, level: 1, xp: 0 });
  const enemy = createMockTank({ id: "enemy", x: 80, y: 0, level: 1, xp: 0 });

  // Minion kill: +10 XP each
  distributeKillXp(victimPos, false, [ally, enemy]);
  assert.equal(ally.xp, KILL_XP_MINION);
  assert.equal(enemy.xp, KILL_XP_MINION);

  // Player kill: +50 XP each
  distributeKillXp(victimPos, true, [ally, enemy]);
  assert.equal(ally.xp, KILL_XP_MINION + KILL_XP_PLAYER);
  assert.equal(enemy.xp, KILL_XP_MINION + KILL_XP_PLAYER);
});

test("distributeKillXp triggers level-up, gives skill points, and updates stats immediately", () => {
  const victimPos = { x: 0, y: 0 };
  const tank = createMockTank({ level: 1, xp: 80, skillPoints: 0 });

  // Player kill (+50 XP): 80 + 50 = 130 -> advances to level 2 with 30 XP, 1 skill point
  distributeKillXp(victimPos, true, [tank]);
  assert.equal(tank.level, 2);
  assert.equal(tank.xp, 30);
  assert.equal(tank.skillPoints, 1);
  assert.equal(tank.maxHp, ROLE_STATS.tank.maxHp + HP_PER_LEVEL);
  assert.equal(tank.fireDamage, ROLE_STATS.tank.fireDamage + DAMAGE_PER_LEVEL);
});

test("applyTankProgressionStats is non-compounding and derives from base role stats", () => {
  const tank = createMockTank({ role: "healer", level: 3 });
  applyTankProgressionStats(tank);
  assert.equal(tank.maxHp, ROLE_STATS.healer.maxHp + 2 * HP_PER_LEVEL);
  assert.equal(tank.fireDamage, ROLE_STATS.healer.fireDamage + 2 * DAMAGE_PER_LEVEL);

  // Calling multiple times does not compound
  applyTankProgressionStats(tank);
  applyTankProgressionStats(tank);
  assert.equal(tank.maxHp, ROLE_STATS.healer.maxHp + 2 * HP_PER_LEVEL);
  assert.equal(tank.fireDamage, ROLE_STATS.healer.fireDamage + 2 * DAMAGE_PER_LEVEL);
});

test("purchaseAbilityUpgrade learns or upgrades ability when points available and below max level", () => {
  const tank = createMockTank({ skillPoints: 2, abilityLevel: 0 });

  // First purchase: learns ability (level 1)
  const learned = purchaseAbilityUpgrade(tank);
  assert.equal(learned, true);
  assert.equal(tank.abilityLevel, 1);
  assert.equal(tank.skillPoints, 1);

  // Second purchase: upgrades to level 2
  const upgraded = purchaseAbilityUpgrade(tank);
  assert.equal(upgraded, true);
  assert.equal(tank.abilityLevel, 2);
  assert.equal(tank.skillPoints, 0);

  // Third purchase without points is rejected
  const rejected = purchaseAbilityUpgrade(tank);
  assert.equal(rejected, false);
  assert.equal(tank.abilityLevel, 2);
  assert.equal(tank.skillPoints, 0);
});

test("purchaseAbilityUpgrade rejects upgrade if already at max level 10", () => {
  const tank = createMockTank({ skillPoints: 5, abilityLevel: MAX_ABILITY_LEVEL });
  const rejected = purchaseAbilityUpgrade(tank);
  assert.equal(rejected, false);
  assert.equal(tank.abilityLevel, MAX_ABILITY_LEVEL);
  assert.equal(tank.skillPoints, 5); // skill points preserved
});
