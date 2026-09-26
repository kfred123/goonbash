/** The set of selectable player roles. */
export type Role = "healer" | "tank" | "damagedealer";

export function isRole(value: unknown): value is Role {
  return value === "healer" || value === "tank" || value === "damagedealer";
}

/** Base combat/movement stats applied to a tank based on its player's selected role. */
export interface RoleStats {
  maxHp: number;
  moveSpeed: number;
  fireRange: number;
  fireCooldownMax: number;
  fireDamage: number;
}

export const ROLE_STATS: Record<Role, RoleStats> = {
  healer: { maxHp: 90, moveSpeed: 95, fireRange: 140, fireCooldownMax: 900, fireDamage: 6 },
  tank: { maxHp: 160, moveSpeed: 70, fireRange: 130, fireCooldownMax: 900, fireDamage: 7 },
  damagedealer: { maxHp: 80, moveSpeed: 100, fireRange: 160, fireCooldownMax: 700, fireDamage: 10 }
};

/** Resolves the base stats for a role, defaulting to Tank stats for an unset/invalid role. */
export function resolveRoleStats(role: unknown): RoleStats {
  return ROLE_STATS[isRole(role) ? role : "tank"];
}

/**
 * Special-ability tuning per role. `magnitude` means different things per role:
 * healer = heal points per second, tank = damage reduction ratio (0-1),
 * damagedealer = fire-rate multiplier (2 = fires twice as often).
 */
export interface RoleAbilityConfig {
  cooldownMs: number;
  durationMs: number;
  magnitude: number;
  /** Effect radius in world units; only meaningful for the healer's area aura. */
  radius?: number;
}

export const ROLE_ABILITY_CONFIG: Record<Role, RoleAbilityConfig> = {
  healer: { cooldownMs: 15000, durationMs: 6000, magnitude: 8, radius: 120 },
  tank: { cooldownMs: 18000, durationMs: 5000, magnitude: 0.5 },
  damagedealer: { cooldownMs: 12000, durationMs: 5000, magnitude: 2 }
};

/** Resolves the ability config for a role, defaulting to Tank's config for an unset/invalid role. */
export function resolveRoleAbilityConfig(role: unknown): RoleAbilityConfig {
  return ROLE_ABILITY_CONFIG[isRole(role) ? role : "tank"];
}

/** Visual identity for a role, shared by the lobby role picker and in-game rendering. */
export interface RoleVisual {
  color: number;
  shape: "circle" | "square" | "triangle";
  label: string;
  abilityLabel: string;
}

export const ROLE_VISUALS: Record<Role, RoleVisual> = {
  healer: { color: 0x33cc66, shape: "circle", label: "Healer", abilityLabel: "Heal Aura" },
  tank: { color: 0x4d8dff, shape: "square", label: "Tank", abilityLabel: "Shield" },
  damagedealer: { color: 0xff5533, shape: "triangle", label: "Damagedealer", abilityLabel: "Rapid Fire" }
};
