import { WORLD_HEIGHT, WORLD_WIDTH } from "./arena";
import type { AbilityId } from "./abilities";

export type AbilityActivationRequest =
  | { abilityId: "damagedealer-homing-rocket"; targetId: string }
  | { abilityId: "damagedealer-mortar"; targetX: number; targetY: number }
  | { abilityId: Exclude<AbilityId, "damagedealer-homing-rocket" | "damagedealer-mortar"> };

export type MortarRejectionReason =
  | "invalid_point" | "out_of_range" | "unavailable" | "unlearned" | "cooldown" | "inactive";

export const MORTAR_IMPACT_MESSAGE = "mortar_impact";
export interface MortarImpactMessage {
  shotId: string;
  team: string;
  x: number;
  y: number;
  radius: number;
}

export function mortarPointRejection(
  shooter: { x: number; y: number },
  x: unknown,
  y: unknown,
  range: number
): "invalid_point" | "out_of_range" | null {
  if (typeof x !== "number" || typeof y !== "number"
    || !Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || y < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) return "invalid_point";
  return Math.hypot(x - shooter.x, y - shooter.y) <= range ? null : "out_of_range";
}
