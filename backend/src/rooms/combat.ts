export interface CombatCandidate {
  id: string;
  x: number;
  y: number;
  team: string;
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
