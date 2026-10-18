import { getBaseCannonAimAngle } from 'shared';
import type { BaseCannonPoint } from 'shared';

export function getBaseCannonRotation(
  team: string,
  origin: BaseCannonPoint,
  target: BaseCannonPoint | null
): number {
  if (target) return getBaseCannonAimAngle(origin, target);
  return team === 'blue' ? 0 : Math.PI;
}
