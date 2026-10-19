import { getBaseCannonAimAngle, TOWER_CANNON_MUZZLE_DISTANCE } from 'shared';
import type { BaseCannonPoint } from 'shared';

export function getTowerCannonRotation(
  team: string,
  origin: BaseCannonPoint,
  target: BaseCannonPoint | null
): number {
  if (target) return getBaseCannonAimAngle(origin, target);
  return team === 'blue' ? 0 : Math.PI;
}

export function getTowerCannonShotFeedback(
  tower: BaseCannonPoint & { shotCount: number; shotAngle: number },
  previousShotCount: number | undefined
): { angle: number; muzzle: BaseCannonPoint } | null {
  if (previousShotCount === undefined || tower.shotCount <= previousShotCount) return null;
  return {
    angle: tower.shotAngle,
    muzzle: {
      x: tower.x + Math.cos(tower.shotAngle) * TOWER_CANNON_MUZZLE_DISTANCE,
      y: tower.y + Math.sin(tower.shotAngle) * TOWER_CANNON_MUZZLE_DISTANCE
    }
  };
}
