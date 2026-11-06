import { ARENA_LANES, isPointOnLane } from "shared";

export const GRASS_MOVEMENT_SPEED_MULTIPLIER = 0.5;

export function terrainMovementMultiplier(position: { x: number; y: number }): number {
  return isPointOnLane(position, ARENA_LANES) ? 1 : GRASS_MOVEMENT_SPEED_MULTIPLIER;
}

export function effectiveTerrainMoveSpeed(speed: number, position: { x: number; y: number }): number {
  return speed * terrainMovementMultiplier(position);
}

export function effectiveScoutTerrainMoveSpeed(
  speed: number,
  position: { x: number; y: number },
  boostActive: boolean,
  multiplier: number
): number {
  const terrainMultiplier = terrainMovementMultiplier(position);
  return speed * terrainMultiplier * (boostActive && terrainMultiplier < 1 ? multiplier : 1);
}
