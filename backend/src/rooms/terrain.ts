import { getLaneWaypoints, isPointOnLane } from "shared";

export const GRASS_MOVEMENT_SPEED_MULTIPLIER = 0.5;

const ARENA_LANES = getLaneWaypoints({ x: 240, y: 900 }, { x: 2160, y: 900 });

export function terrainMovementMultiplier(position: { x: number; y: number }): number {
  return isPointOnLane(position, ARENA_LANES) ? 1 : GRASS_MOVEMENT_SPEED_MULTIPLIER;
}

export function effectiveTerrainMoveSpeed(speed: number, position: { x: number; y: number }): number {
  return speed * terrainMovementMultiplier(position);
}
