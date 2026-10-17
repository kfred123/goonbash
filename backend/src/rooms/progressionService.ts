import type { Point } from "./combat.js";
import { isWithinRange } from "./combat.js";
import {
  addExperience,
  computeProgressionStats,
  canUpgradeAbility,
  computeAbilityConfigForLevel,
  resolveRoleStats,
  KILL_XP_MINION,
  KILL_XP_PLAYER,
  KILL_XP_RADIUS,
  MAX_ABILITY_LEVEL
} from "shared";

export interface ProgressionTank extends Point {
  id: string;
  role: string;
  state: "alive" | "dead";
  level: number;
  xp: number;
  skillPoints: number;
  abilityLevel: number;
  hp: number;
  maxHp: number;
  fireDamage: number;
  abilityCooldownMax: number;
}

/**
 * Finds all living tanks within range of a target position.
 */
export function findEligibleTanksForKillXp<T extends ProgressionTank>(
  targetPos: Point,
  tanks: Iterable<T>,
  radius: number = KILL_XP_RADIUS
): T[] {
  const eligible: T[] = [];
  for (const tank of tanks) {
    if (tank.state === "dead") continue;
    if (isWithinRange(tank, targetPos, radius)) {
      eligible.push(tank);
    }
  }
  return eligible;
}

/**
 * Recomputes maxHp and fireDamage according to role base stats and current level,
 * updating hp if current hp exceeds new maxHp.
 */
export function applyTankProgressionStats(tank: ProgressionTank): void {
  const base = resolveRoleStats(tank.role);
  const derived = computeProgressionStats(base, tank.level);
  tank.maxHp = derived.maxHp;
  tank.fireDamage = derived.fireDamage;
  if (tank.hp > tank.maxHp) {
    tank.hp = tank.maxHp;
  }
  const abilityConfig = computeAbilityConfigForLevel(tank.role as any, tank.abilityLevel);
  tank.abilityCooldownMax = abilityConfig.cooldownMs;
}

/**
 * Grants kill XP to all eligible living tanks within KILL_XP_RADIUS of the victim.
 * For each tank, applies level-up and stat gains.
 */
export function distributeKillXp<T extends ProgressionTank>(
  victimPos: Point,
  isPlayerKill: boolean,
  tanks: Iterable<T>,
  radius: number = KILL_XP_RADIUS
): void {
  const amount = isPlayerKill ? KILL_XP_PLAYER : KILL_XP_MINION;
  const eligible = findEligibleTanksForKillXp(victimPos, tanks, radius);
  for (const tank of eligible) {
    const progress = addExperience(tank.level, tank.xp, tank.skillPoints, amount);
    const leveledUp = progress.level > tank.level;
    tank.level = progress.level;
    tank.xp = progress.xp;
    tank.skillPoints = progress.skillPoints;
    if (leveledUp) {
      applyTankProgressionStats(tank);
    }
  }
}

/**
 * Attempts to learn or upgrade an ability for a tank.
 * Returns true if the purchase was valid and applied; false if rejected.
 */
export function purchaseAbilityUpgrade(tank: ProgressionTank): boolean {
  if (!canUpgradeAbility(tank.skillPoints, tank.abilityLevel, MAX_ABILITY_LEVEL)) {
    return false;
  }
  tank.skillPoints -= 1;
  tank.abilityLevel += 1;
  applyTankProgressionStats(tank);
  return true;
}
