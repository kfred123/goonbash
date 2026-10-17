import type { Role } from "./roles.js";

export const MAX_ABILITY_LEVEL = 10;

export const ABILITY_IDS = [
  "healer-aura",
  "healer-speed",
  "tank-shield",
  "tank-entrench",
  "damagedealer-rapidfire",
  "damagedealer-homing-rocket"
] as const;

export type AbilityId = typeof ABILITY_IDS[number];

export interface AbilityConfig {
  cooldownMs: number;
  durationMs: number;
  magnitude: number;
  radius?: number;
  range?: number;
  projectileSpeed?: number;
}

export interface AbilityDefinition {
  id: AbilityId;
  role: Role;
  name: string;
  config: AbilityConfig;
}

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
  "healer-aura": {
    id: "healer-aura", role: "healer", name: "Heal Aura",
    config: { cooldownMs: 15000, durationMs: 6000, magnitude: 8, radius: 120 }
  },
  "healer-speed": {
    id: "healer-speed", role: "healer", name: "Speed",
    config: { cooldownMs: 18000, durationMs: 4000, magnitude: 1.15 }
  },
  "tank-shield": {
    id: "tank-shield", role: "tank", name: "Shield",
    config: { cooldownMs: 18000, durationMs: 5000, magnitude: 0.5 }
  },
  "tank-entrench": {
    id: "tank-entrench", role: "tank", name: "Entrench",
    config: { cooldownMs: 24000, durationMs: 4000, magnitude: 0.85 }
  },
  "damagedealer-rapidfire": {
    id: "damagedealer-rapidfire", role: "damagedealer", name: "Rapid Fire",
    config: { cooldownMs: 12000, durationMs: 5000, magnitude: 2 }
  },
  "damagedealer-homing-rocket": {
    id: "damagedealer-homing-rocket", role: "damagedealer", name: "Homing Rocket",
    config: { cooldownMs: 20000, durationMs: 0, magnitude: 3, range: 900, projectileSpeed: 450 }
  }
};

export const ROLE_ABILITY_IDS: Record<Role, readonly AbilityId[]> = {
  healer: ["healer-aura", "healer-speed"],
  tank: ["tank-shield", "tank-entrench"],
  damagedealer: ["damagedealer-rapidfire", "damagedealer-homing-rocket"]
};

export function isAbilityId(value: unknown): value is AbilityId {
  return typeof value === "string" && (ABILITY_IDS as readonly string[]).includes(value);
}

export function getAbilityDefinition(abilityId: AbilityId): AbilityDefinition {
  return ABILITY_DEFINITIONS[abilityId];
}

export function canUpgradeAbility(
  skillPoints: number,
  currentLevel: number,
  maxLevel: number = MAX_ABILITY_LEVEL
): boolean {
  return skillPoints > 0 && currentLevel >= 0 && currentLevel < maxLevel;
}

export function computeAbilityConfigForLevel(
  abilityId: AbilityId,
  level: number
): AbilityConfig {
  const base = getAbilityDefinition(abilityId).config;
  const safeLevel = Math.min(MAX_ABILITY_LEVEL, Math.max(1, Math.floor(level)));
  const rank = level <= 0 ? 0 : safeLevel - 1;
  const cooldownMs = Math.round(base.cooldownMs * Math.max(0.5, 1 - rank * 0.03));
  let magnitude = base.magnitude;

  switch (abilityId) {
    case "healer-aura":
      magnitude += rank * 0.8;
      break;
    case "healer-speed":
      magnitude += rank * 0.05;
      break;
    case "tank-shield":
      magnitude = Math.min(0.8, magnitude + rank * 0.02);
      break;
    case "tank-entrench":
      magnitude = Math.min(0.94, magnitude + rank * 0.01);
      break;
    case "damagedealer-rapidfire":
      magnitude += rank * 0.1;
      break;
    case "damagedealer-homing-rocket":
      magnitude += rank * 0.25;
      break;
  }

  return { ...base, cooldownMs, magnitude: Number(magnitude.toFixed(2)) };
}
