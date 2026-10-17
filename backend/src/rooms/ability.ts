import type { AbilityConfig, AbilityId } from "shared";
import { computeAbilityConfigForLevel, isRole, ROLE_ABILITY_IDS } from "shared";

export interface AbilityTiming {
  cooldownEndsAt: number;
  cooldownMax: number;
  activeUntil: number;
}

export interface TimedAbilityState {
  level: number;
  cooldownEndsAt: number;
  activeUntil: number;
}

export function abilityBelongsToRole(role: unknown, abilityId: unknown): abilityId is AbilityId {
  return isRole(role) && typeof abilityId === "string" &&
    (ROLE_ABILITY_IDS[role] as readonly string[]).includes(abilityId);
}

export function canActivateAbility(now: number, ability: TimedAbilityState): boolean {
  return ability.level > 0 && now >= ability.cooldownEndsAt;
}

export function canActivateRoleAbility(
  now: number,
  role: unknown,
  abilityId: unknown,
  ability: TimedAbilityState | undefined
): abilityId is AbilityId {
  return abilityBelongsToRole(role, abilityId) && ability !== undefined && canActivateAbility(now, ability);
}

export function activateAbility(now: number, config: AbilityConfig): AbilityTiming {
  return {
    cooldownEndsAt: now + config.cooldownMs,
    cooldownMax: config.cooldownMs,
    activeUntil: now + config.durationMs
  };
}

export function isAbilityActive(now: number, ability: TimedAbilityState | undefined): boolean {
  return ability !== undefined && now < ability.activeUntil;
}

export function applyDamageReduction(damage: number, reductionRatio: number): number {
  return damage * (1 - reductionRatio);
}

export function strongestReduction(shield: number, entrench: number): number {
  return Math.max(shield, entrench);
}

export function effectiveFireCooldown(baseCooldownMax: number, active: boolean, fireRateMultiplier: number): number {
  return active ? baseCooldownMax / fireRateMultiplier : baseCooldownMax;
}

export function effectiveMoveSpeed(baseMoveSpeed: number, speedActive: boolean, multiplier: number): number {
  return speedActive ? baseMoveSpeed * multiplier : baseMoveSpeed;
}

export function isMovementLocked(role: string, entrenchActive: boolean): boolean {
  return role === "tank" && entrenchActive;
}

export function healOverTick(hp: number, maxHp: number, healPerSecond: number, elapsedSeconds: number): number {
  return Math.min(maxHp, hp + healPerSecond * elapsedSeconds);
}

export function abilityConfig(abilityId: AbilityId, level: number): AbilityConfig {
  return computeAbilityConfigForLevel(abilityId, level);
}

export function homingRocketDamage(fireDamage: number, abilityLevel: number): number {
  return fireDamage * computeAbilityConfigForLevel("damagedealer-homing-rocket", abilityLevel).magnitude;
}

export interface RocketTarget {
  team: string;
  x: number;
  y: number;
  hp: number;
  state?: string;
}

export function isValidRocketTarget(
  shooter: { team: string; x: number; y: number },
  target: RocketTarget | undefined,
  range: number
): boolean {
  return target !== undefined &&
    target.team !== shooter.team &&
    target.hp > 0 &&
    target.state !== "dead" &&
    Math.hypot(target.x - shooter.x, target.y - shooter.y) <= range;
}
