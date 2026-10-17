import type { AbilityId, Role } from "shared";
import { ROLE_ABILITY_IDS } from "shared";

export function getRoleAbilityAtIndex(role: string, index: number): AbilityId | null {
  if (!(role in ROLE_ABILITY_IDS)) return null;
  return ROLE_ABILITY_IDS[role as Role][index] ?? null;
}

export interface RocketClickTarget {
  id?: string;
  team: string;
  x: number;
  y: number;
  hp?: number;
  state?: string;
}

export interface AbilityHudProgress {
  level: number;
  cooldownEndsAt: number;
  cooldownMax: number;
  activeUntil: number;
}

export type AbilityHudStatus =
  | { state: "locked"; remainingMs: 0; cooldownFraction: 0 }
  | { state: "active"; remainingMs: number; cooldownFraction: number }
  | { state: "cooldown"; remainingMs: number; cooldownFraction: number }
  | { state: "ready"; remainingMs: 0; cooldownFraction: 0 };

export function getAbilityHudStatus(ability: AbilityHudProgress, now: number): AbilityHudStatus {
  if (ability.level <= 0) return { state: "locked", remainingMs: 0, cooldownFraction: 0 };
  const remainingMs = Math.max(0, ability.cooldownEndsAt - now);
  const cooldownFraction = ability.cooldownMax > 0 ? Math.min(1, remainingMs / ability.cooldownMax) : 0;
  if (now < ability.activeUntil) return { state: "active", remainingMs, cooldownFraction };
  if (remainingMs > 0) return { state: "cooldown", remainingMs, cooldownFraction };
  return { state: "ready", remainingMs: 0, cooldownFraction: 0 };
}

export function isRocketTargetClickValid(
  shooter: { team: string; x: number; y: number },
  target: RocketClickTarget | null,
  range: number
): boolean {
  return target !== null &&
    target.team !== shooter.team &&
    (target.hp === undefined || target.hp > 0) &&
    target.state !== "dead" &&
    Math.hypot(target.x - shooter.x, target.y - shooter.y) <= range;
}

export type ArenaClickAction =
  | { type: "rocket"; targetId: string }
  | { type: "attack"; targetId: string; x: number; y: number }
  | { type: "move"; x: number; y: number }
  | { type: "ignore" };

export function resolveArenaClick(
  rocketSelection: boolean,
  shooter: { team: string; x: number; y: number },
  target: RocketClickTarget | null,
  worldPoint: { x: number; y: number },
  rocketRange: number
): ArenaClickAction {
  if (rocketSelection) {
    return target?.id && isRocketTargetClickValid(shooter, target, rocketRange)
      ? { type: "rocket", targetId: target.id }
      : { type: "ignore" };
  }
  if (target) {
    return target.team === shooter.team
      ? { type: "ignore" }
      : target.id
        ? { type: "attack", targetId: target.id, x: target.x, y: target.y }
        : { type: "ignore" };
  }
  return { type: "move", x: worldPoint.x, y: worldPoint.y };
}

export function shouldCancelRocketTargetSelection(pointerButton: number, key?: string): boolean {
  return pointerButton === 2 || key === "Escape";
}

export function shouldHandleAbilityKeydown(event: Pick<KeyboardEvent, "repeat">): boolean {
  return !event.repeat;
}
