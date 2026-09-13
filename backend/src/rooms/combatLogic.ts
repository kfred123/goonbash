import type { Point } from "shared";

export interface Combatant {
  id: string;
  x: number;
  y: number;
  team: string;
  hp: number;
}

/**
 * Finds the closest living enemy (different team, hp > 0) within `range` of `attacker`.
 * Returns undefined if no such enemy exists. Ties keep the first-found closest candidate.
 */
export function findNearestTarget<T extends Combatant>(
  attacker: { x: number; y: number; team: string },
  candidates: Iterable<T>,
  range: number
): T | undefined {
  let best: T | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (candidate.team === attacker.team || candidate.hp <= 0) continue;
    const distance = Math.hypot(candidate.x - attacker.x, candidate.y - attacker.y);
    if (distance <= range && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Moves `current` toward `target` by at most `maxDistance`, clamping to `target`
 * once within reach so callers don't overshoot the waypoint.
 */
export function stepToward(current: Point, target: Point, maxDistance: number): Point {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDistance || distance < 1e-6) {
    return { x: target.x, y: target.y };
  }
  return {
    x: current.x + (dx / distance) * maxDistance,
    y: current.y + (dy / distance) * maxDistance
  };
}

/** Applies damage-per-second style damage over `elapsedSeconds`, clamped at 0. */
export function applyDamage(hp: number, damagePerSecond: number, elapsedSeconds: number): number {
  return Math.max(0, hp - damagePerSecond * elapsedSeconds);
}

/** True once `point` is within `epsilon` world units of `waypoint`. */
export function hasReachedWaypoint(point: Point, waypoint: Point, epsilon = 1): boolean {
  return Math.hypot(waypoint.x - point.x, waypoint.y - point.y) <= epsilon;
}

/** A tower can only spawn mobs while it hasn't been destroyed. */
export function shouldSpawnFromTower(tower: { hp: number }): boolean {
  return tower.hp > 0;
}
