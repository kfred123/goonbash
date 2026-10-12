import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addExperience,
  computeProgressionStats,
  getRequiredXpForNextLevel,
  DAMAGE_PER_LEVEL,
  HP_PER_LEVEL
} from "./progression.js";
import { ROLE_STATS } from "./roles.js";

test("getRequiredXpForNextLevel scales linearly with 100 * level", () => {
  assert.equal(getRequiredXpForNextLevel(1), 100);
  assert.equal(getRequiredXpForNextLevel(2), 200);
  assert.equal(getRequiredXpForNextLevel(5), 500);
  assert.equal(getRequiredXpForNextLevel(0), 100); // clamps at minimum level 1
});

test("addExperience advances to level 2 with exact threshold and resets current xp to 0", () => {
  const result = addExperience(1, 0, 0, 100);
  assert.deepEqual(result, {
    level: 2,
    xp: 0,
    skillPoints: 1,
    levelsGained: 1
  });
});

test("addExperience retains progress within current level when threshold not reached", () => {
  const result = addExperience(1, 40, 0, 30);
  assert.deepEqual(result, {
    level: 1,
    xp: 70,
    skillPoints: 0,
    levelsGained: 0
  });
});

test("addExperience carries over excess xp into the new level", () => {
  // Level 1: 90 xp + 50 earned = 140 xp. 100 consumed to reach level 2, leaving 40 / 200 xp.
  const result = addExperience(1, 90, 0, 50);
  assert.deepEqual(result, {
    level: 2,
    xp: 40,
    skillPoints: 1,
    levelsGained: 1
  });
});

test("addExperience supports multi-level jumps in a single grant", () => {
  // From level 1, 0 xp:
  // Lvl 1 -> 2 requires 100
  // Lvl 2 -> 3 requires 200
  // Lvl 3 -> 4 requires 300
  // Total to reach Lvl 4 = 600 xp.
  // Granting 650 xp -> Lvl 4 with 50 xp leftover, +3 skill points.
  const result = addExperience(1, 0, 0, 650);
  assert.deepEqual(result, {
    level: 4,
    xp: 50,
    skillPoints: 3,
    levelsGained: 3
  });
});

test("computeProgressionStats applies non-compounding level bonuses on top of role base", () => {
  const tankBase = ROLE_STATS.tank;
  const lvl1 = computeProgressionStats(tankBase, 1);
  assert.equal(lvl1.maxHp, tankBase.maxHp);
  assert.equal(lvl1.fireDamage, tankBase.fireDamage);

  const lvl2 = computeProgressionStats(tankBase, 2);
  assert.equal(lvl2.maxHp, tankBase.maxHp + HP_PER_LEVEL);
  assert.equal(lvl2.fireDamage, tankBase.fireDamage + DAMAGE_PER_LEVEL);

  const lvl5 = computeProgressionStats(tankBase, 5);
  assert.equal(lvl5.maxHp, tankBase.maxHp + 4 * HP_PER_LEVEL);
  assert.equal(lvl5.fireDamage, tankBase.fireDamage + 4 * DAMAGE_PER_LEVEL);
});

test("computeProgressionStats is deterministic and does not mutate input base stats", () => {
  const base = { ...ROLE_STATS.healer };
  const originalMaxHp = base.maxHp;
  const originalFireDamage = base.fireDamage;

  computeProgressionStats(base, 10);
  computeProgressionStats(base, 10);

  assert.equal(base.maxHp, originalMaxHp);
  assert.equal(base.fireDamage, originalFireDamage);
});
