import type { RoleStats } from "./roles.js";

export const KILL_XP_MINION = 10;
export const KILL_XP_PLAYER = 50;
export const KILL_XP_RADIUS = 500;
export const HP_PER_LEVEL = 5;
export const DAMAGE_PER_LEVEL = 0.5;

/** Experience required to advance from the given level N to N + 1. */
export function getRequiredXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * safeLevel;
}

export interface LevelProgress {
  level: number;
  xp: number;
  skillPoints: number;
  levelsGained: number;
}

/**
 * Calculates updated level, current-level XP, and skill points after adding earned XP.
 * Carries excess XP into subsequent levels, supporting multiple level-ups in one grant.
 */
export function addExperience(
  currentLevel: number,
  currentXp: number,
  currentSkillPoints: number,
  earnedXp: number
): LevelProgress {
  let level = Math.max(1, Math.floor(currentLevel));
  let xp = Math.max(0, currentXp) + Math.max(0, earnedXp);
  let skillPoints = Math.max(0, currentSkillPoints);
  let levelsGained = 0;

  while (true) {
    const required = getRequiredXpForNextLevel(level);
    if (xp >= required) {
      xp -= required;
      level += 1;
      skillPoints += 1;
      levelsGained += 1;
    } else {
      break;
    }
  }

  return { level, xp, skillPoints, levelsGained };
}

/**
 * Computes a tank's maxHp and fireDamage by applying non-compounding level bonuses
 * on top of the role's base stats. Level 1 receives 0 bonus; each level above 1
 * adds +5 maxHp and +0.5 fireDamage.
 */
export function computeProgressionStats(
  baseStats: RoleStats,
  level: number
): { maxHp: number; fireDamage: number } {
  const bonusLevels = Math.max(0, Math.floor(level) - 1);
  return {
    maxHp: baseStats.maxHp + bonusLevels * HP_PER_LEVEL,
    fireDamage: Number((baseStats.fireDamage + bonusLevels * DAMAGE_PER_LEVEL).toFixed(2))
  };
}
