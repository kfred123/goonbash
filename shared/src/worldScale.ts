// Factors always refer to the original dimensions, not a previously scaled value.
export const WORLD_SCALE = Object.freeze({
  entity: 1.20,
  roadWidth: 1.20,
  grassGap: 0.90
});

export const WORLD_BASELINE = Object.freeze({
  width: 2400,
  height: 1800,
  middleLaneY: 900,
  laneSpacing: 750,
  roadWidth: 112,
  borderWidth: 124,
  playerSize: 40,
  minionSize: 18
});

export interface WorldScaleFactors {
  readonly entity: number;
  readonly roadWidth: number;
  readonly grassGap: number;
}

export function deriveWorldDimensions(factors: WorldScaleFactors) {
  for (const [name, value] of Object.entries(factors)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid world scale ${name}: expected a finite positive factor, received ${value}`);
    }
  }
  const roadWidth = WORLD_BASELINE.roadWidth * factors.roadWidth;
  const borderWidth = WORLD_BASELINE.borderWidth * factors.roadWidth;
  const grassGap = (WORLD_BASELINE.laneSpacing - WORLD_BASELINE.borderWidth) * factors.grassGap;
  const laneSpacing = grassGap + borderWidth;
  const playerSize = WORLD_BASELINE.playerSize * factors.entity;
  const minionSize = WORLD_BASELINE.minionSize * factors.entity;
  const laneRows: readonly [number, number, number] = [
    WORLD_BASELINE.middleLaneY - laneSpacing,
    WORLD_BASELINE.middleLaneY,
    WORLD_BASELINE.middleLaneY + laneSpacing
  ];
  if (![roadWidth, borderWidth, grassGap, laneSpacing, playerSize, minionSize].every(Number.isFinite)
    || laneRows[0] - borderWidth / 2 < 0
    || laneRows[2] + borderWidth / 2 > WORLD_BASELINE.height
    || borderWidth / 2 > 240) {
    throw new Error("Invalid world scale: derived dimensions exceed arena bounds or numeric limits");
  }
  return Object.freeze({ roadWidth, borderWidth, grassGap, laneRows: Object.freeze(laneRows), playerSize, minionSize });
}

export const WORLD_DIMENSIONS = deriveWorldDimensions(WORLD_SCALE);
