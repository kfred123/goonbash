import { WORLD_SCALE } from "./worldScale";

export const TOWER_COLLISION_RADIUS = 24;
// The outpost's stroked 42x38 foundation at (0, 2) reaches (22, 22).
// Its corner bounds the rotating cannon and the smaller ruin as well.
export const TOWER_FOOTPRINT_RADIUS = Math.max(TOWER_COLLISION_RADIUS, Math.hypot(22, 22) * WORLD_SCALE.entity);
