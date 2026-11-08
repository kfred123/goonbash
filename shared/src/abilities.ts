import type { Role } from "./roles.js";

export const MAX_ABILITY_LEVEL = 10;

export const ABILITY_IDS = [
  "healer-aura",
  "healer-speed",
  "healer-rescue-impulse",
  "tank-shield",
  "tank-entrench",
  "damagedealer-rapidfire",
  "damagedealer-homing-rocket",
  "damagedealer-mortar",
  "scout-weitsicht",
  "scout-offroad",
  "scout-shockshot"
] as const;

export type AbilityId = typeof ABILITY_IDS[number];

export type RescueImpulseRejectionReason =
  | "invalid_target" | "unavailable" | "unlearned" | "cooldown" | "inactive";

export interface AbilityConfig {
  cooldownMs: number;
  durationMs: number;
  magnitude: number;
  radius?: number;
  range?: number;
  projectileSpeed?: number;
  flightDurationMs?: number;
  buildingMultiplier?: number;
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
  "healer-rescue-impulse": {
    id: "healer-rescue-impulse", role: "healer", name: "Rettungsimpuls",
    config: { cooldownMs: 20000, durationMs: 0, magnitude: 18, range: 250 }
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
  },
  "damagedealer-mortar": {
    id: "damagedealer-mortar", role: "damagedealer", name: "Mortar",
    config: { cooldownMs: 24000, durationMs: 0, magnitude: 2, range: 900, radius: 120, flightDurationMs: 1500, buildingMultiplier: 3 }
  },
  "scout-weitsicht": {
    id: "scout-weitsicht", role: "scout", name: "Weitsicht",
    config: { cooldownMs: 24000, durationMs: 4000, magnitude: 150 }
  },
  "scout-offroad": {
    id: "scout-offroad", role: "scout", name: "Offroad",
    config: { cooldownMs: 18000, durationMs: 5000, magnitude: 1.2 }
  },
  "scout-shockshot": {
    id: "scout-shockshot", role: "scout", name: "Schockschuss",
    config: { cooldownMs: 16000, durationMs: 2000, magnitude: 0, range: 650, projectileSpeed: 550 }
  }
};

export const ROLE_ABILITY_IDS: Record<Role, readonly AbilityId[]> = {
  healer: ["healer-aura", "healer-speed", "healer-rescue-impulse"],
  tank: ["tank-shield", "tank-entrench"],
  damagedealer: ["damagedealer-rapidfire", "damagedealer-homing-rocket", "damagedealer-mortar"],
  scout: ["scout-weitsicht", "scout-offroad", "scout-shockshot"]
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
  let durationMs = base.durationMs;

  switch (abilityId) {
    case "healer-aura":
      magnitude += rank * 0.8;
      break;
    case "healer-speed":
      magnitude += rank * 0.05;
      break;
    case "healer-rescue-impulse":
      magnitude += rank * 3;
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
    case "damagedealer-mortar":
      magnitude += rank * 0.2;
      break;
    case "scout-weitsicht":
      magnitude += rank * 50;
      durationMs += rank * 500;
      break;
    case "scout-offroad":
      magnitude += rank * 0.05;
      break;
    case "scout-shockshot":
      durationMs += rank * 500;
      break;
  }

  return { ...base, cooldownMs, durationMs, magnitude: Number(magnitude.toFixed(2)) };
}
