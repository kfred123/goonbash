import type { Point } from "./combat.js";
import { isWithinRange } from "./combat.js";
import {
  addExperience,
  computeProgressionStats,
  canUpgradeAbility,
  isAbilityId,
  isRole,
  ROLE_ABILITY_IDS,
  resolveRoleStats,
  KILL_XP_MINION,
  KILL_XP_PLAYER,
  KILL_XP_RADIUS
} from "shared";
import type { AbilityId } from "shared";

export interface AbilityProgress {
  level: number;
  cooldownEndsAt: number;
  cooldownMax: number;
  activeUntil: number;
}

export interface ProgressionTank extends Point {
  id: string;
  role: string;
  state: "alive" | "dead";
  level: number;
  xp: number;
  skillPoints: number;
  abilities: Map<string, AbilityProgress>;
  hp: number;
  maxHp: number;
  fireDamage: number;
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
export function purchaseAbilityUpgrade(tank: ProgressionTank, requestedAbilityId: unknown): boolean {
  if (!isRole(tank.role) || !isAbilityId(requestedAbilityId)) return false;
  const abilityId: AbilityId = requestedAbilityId;
  if (!ROLE_ABILITY_IDS[tank.role].includes(abilityId)) return false;
  const ability = tank.abilities.get(abilityId);
  if (!ability || !canUpgradeAbility(tank.skillPoints, ability.level)) {
    return false;
  }
  tank.skillPoints -= 1;
  ability.level += 1;
  return true;
}
