import type { Role, RoleAbilityConfig } from "./roles.js";
import { resolveRoleAbilityConfig } from "./roles.js";

export const MAX_ABILITY_LEVEL = 10;

export interface AbilityDefinition {
  id: string;
  role: Role;
  name: string;
}

/**
 * Checks whether an ability can be learned or upgraded given current points and level.
 */
export function canUpgradeAbility(
  skillPoints: number,
  currentLevel: number,
  maxLevel: number = MAX_ABILITY_LEVEL
): boolean {
  if (skillPoints < 1) return false;
  if (currentLevel < 0) return false;
  return currentLevel < maxLevel;
}

/**
 * Computes scaled ability configuration based on ability level (1 to 10).
 * Level 1 uses base configuration.
 * Each additional level slightly reduces cooldown (by 3%, capped at 50% min)
 * and slightly boosts magnitude (by 5%).
 * Unlearned abilities (level <= 0) return the base config.
 */
export function computeAbilityConfigForLevel(
  role: Role,
  level: number
): RoleAbilityConfig {
  const base = resolveRoleAbilityConfig(role);
  if (level <= 0) return { ...base };
  const safeLevel = Math.min(MAX_ABILITY_LEVEL, Math.max(1, Math.floor(level)));
  const rank = safeLevel - 1; // 0 for level 1, up to 9 for level 10

  // Cooldown reduces by 3% per rank above 1, minimum 50% of base
  const cooldownFactor = Math.max(0.5, 1 - rank * 0.03);
  const cooldownMs = Math.round(base.cooldownMs * cooldownFactor);

  // Magnitude scales by +5% per rank above 1
  let magnitude = base.magnitude;
  if (role === "tank") {
    // Tank shield: base is 0.5 (50% reduction). At level 10: 0.5 + 9*0.02 = 0.68 max 0.8
    magnitude = Math.min(0.8, Number((base.magnitude + rank * 0.02).toFixed(2)));
  } else if (role === "damagedealer") {
    // Rapid fire multiplier: base 2. Level 10: 2 + 9*0.1 = 2.9
    magnitude = Number((base.magnitude + rank * 0.1).toFixed(2));
  } else if (role === "healer") {
    // Heal points per second: base 8. Level 10: 8 + 9*0.8 = 15.2
    magnitude = Number((base.magnitude + rank * 0.8).toFixed(2));
  }

  return {
    ...base,
    cooldownMs,
    magnitude
  };
}
