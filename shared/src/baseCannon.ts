export interface BaseCannonPoint {
  x: number;
  y: number;
}

export const BASE_CANNON_MUZZLE_DISTANCE = 36;

export function getBaseCannonAimAngle(origin: BaseCannonPoint, target: BaseCannonPoint): number {
  return Math.atan2(target.y - origin.y, target.x - origin.x);
}

export function getBaseCannonMuzzlePosition(origin: BaseCannonPoint, target: BaseCannonPoint): BaseCannonPoint {
  const angle = getBaseCannonAimAngle(origin, target);
  return {
    x: origin.x + Math.cos(angle) * BASE_CANNON_MUZZLE_DISTANCE,
    y: origin.y + Math.sin(angle) * BASE_CANNON_MUZZLE_DISTANCE
  };
}
