export interface CombatCandidate {
  id: string;
  x: number;
  y: number;
  team: string;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Finds the closest candidate belonging to an enemy team within range.
 * Friendly-team candidates are always excluded from consideration, so they
 * can never be selected as a target and never "block" a closer enemy from
 * being picked.
 */
export function findNearestEnemyInRange<T extends CombatCandidate>(
  shooter: { x: number; y: number; team: string },
  candidates: Iterable<T>,
  range: number
): T | null {
  let nearest: T | null = null;
  let nearestDistSq = range * range;
  for (const candidate of candidates) {
    if (candidate.team === shooter.team) continue;
    const dx = candidate.x - shooter.x;
    const dy = candidate.y - shooter.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= nearestDistSq) {
      nearest = candidate;
      nearestDistSq = distSq;
    }
  }
  return nearest;
}

/** Whether a projectile has traveled close enough to its target to register a hit. */
export function hasProjectileReachedTarget(
  projectileX: number,
  projectileY: number,
  targetX: number,
  targetY: number,
  hitRadius: number
): boolean {
  const dx = targetX - projectileX;
  const dy = targetY - projectileY;
  return dx * dx + dy * dy <= hitRadius * hitRadius;
}

/** Whether an entity's HP has been depleted and it should be treated as destroyed/dead. */
export function hasDied(hp: number): boolean {
  return hp <= 0;
}

/** Applies damage to HP, clamped so it never drops below zero. */
export function applyDamage(hp: number, damage: number): number {
  return Math.max(0, hp - damage);
}

export interface RespawnedTankState {
  hp: number;
  x: number;
  y: number;
  state: "alive";
  respawnAt: number;
}

/** Computes the reset state a tank should have when it respawns at its team's base. */
export function respawnTank(maxHp: number, baseX: number, baseY: number): RespawnedTankState {
  return { hp: maxHp, x: baseX, y: baseY, state: "alive", respawnAt: 0 };
}

/** Whether a dead tank's respawn delay has elapsed and it should reappear. */
export function isReadyToRespawn(tank: { state: string; respawnAt: number }, now: number): boolean {
  return tank.state === "dead" && now >= tank.respawnAt;
}

/** Clamps a point's coordinates to stay within the given rectangular world bounds. */
export function clampToBounds(
  point: Point,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): Point {
  return {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y))
  };
}

/** Whether a point is within a given range of another point (inclusive). */
export function isWithinRange(a: Point, b: Point, range: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy <= range * range;
}

/**
 * Moves a point one step toward a destination at the given speed (units per tick).
 * Snaps to the destination and reports arrival once within `arrivalEpsilon`, or once
 * this step's speed is enough to cover the remaining distance, so a unit stops
 * exactly on its target instead of oscillating around it.
 */
export function stepToward(
  current: Point,
  destination: Point,
  speed: number,
  arrivalEpsilon: number = 2
): { x: number; y: number; arrived: boolean } {
  const dx = destination.x - current.x;
  const dy = destination.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= arrivalEpsilon || distance <= speed) {
    return { x: destination.x, y: destination.y, arrived: true };
  }
  const step = Math.min(distance, speed);
  return {
    x: current.x + (dx / distance) * step,
    y: current.y + (dy / distance) * step,
    arrived: false
  };
}
