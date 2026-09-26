import type { Role } from "shared";
import { ROLE_ABILITY_CONFIG } from "shared";

export interface AbilityTiming {
  abilityCooldownEndsAt: number;
  abilityCooldownMax: number;
  abilityActiveUntil: number;
}

/** Whether a role's special ability can be activated right now, given when its cooldown ends. */
export function canActivateAbility(now: number, abilityCooldownEndsAt: number): boolean {
  return now >= abilityCooldownEndsAt;
}

/** Computes the cooldown/active-until timestamps produced by activating a role's ability right now. */
export function activateRoleAbility(role: Role, now: number): AbilityTiming {
  const config = ROLE_ABILITY_CONFIG[role];
  return {
    abilityCooldownEndsAt: now + config.cooldownMs,
    abilityCooldownMax: config.cooldownMs,
    abilityActiveUntil: now + config.durationMs
  };
}

/** Whether an ability's timed effect (shield/aura/rapid-fire) is currently active. */
export function isAbilityActive(now: number, abilityActiveUntil: number): boolean {
  return now < abilityActiveUntil;
}

/** Applies the Tank role's shield damage reduction to an incoming damage amount, when the shield is active. */
export function applyShieldReduction(damage: number, active: boolean, reductionRatio: number): number {
  return active ? damage * (1 - reductionRatio) : damage;
}

/** Computes the effective fire cooldown for a Damagedealer, applying the rapid-fire multiplier while active. */
export function effectiveFireCooldown(baseCooldownMax: number, active: boolean, fireRateMultiplier: number): number {
  return active ? baseCooldownMax / fireRateMultiplier : baseCooldownMax;
}

/** Computes the new HP after one tick of the Healer aura's heal-per-second rate, clamped to max HP. */
export function healOverTick(hp: number, maxHp: number, healPerSecond: number, elapsedSeconds: number): number {
  return Math.min(maxHp, hp + healPerSecond * elapsedSeconds);
}
