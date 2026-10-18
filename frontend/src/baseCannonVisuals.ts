import { BASE_CANNON_MUZZLE_DISTANCE, getBaseCannonAimAngle } from 'shared';
import type { BaseCannonPoint } from 'shared';

export function getBaseCannonRotation(
  team: string,
  origin: BaseCannonPoint,
  target: BaseCannonPoint | null
): number {
  if (target) return getBaseCannonAimAngle(origin, target);
  return team === 'blue' ? 0 : Math.PI;
}

export function getBaseCannonShotFeedback(
  base: BaseCannonPoint & { shotCount: number; shotAngle: number },
  previousShotCount: number | undefined
): { angle: number; muzzle: BaseCannonPoint } | null {
  if (previousShotCount === undefined || base.shotCount <= previousShotCount) return null;
  return {
    angle: base.shotAngle,
    muzzle: {
      x: base.x + Math.cos(base.shotAngle) * BASE_CANNON_MUZZLE_DISTANCE,
      y: base.y + Math.sin(base.shotAngle) * BASE_CANNON_MUZZLE_DISTANCE
    }
  };
}
