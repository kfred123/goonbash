import { getLaneWaypoints } from "./lanes";
import { WORLD_BASELINE, WORLD_DIMENSIONS } from "./worldScale";

export const WORLD_WIDTH = WORLD_BASELINE.width;
export const WORLD_HEIGHT = WORLD_BASELINE.height;
export const BLUE_BASE_POSITION = { x: 240, y: 900 } as const;
export const RED_BASE_POSITION = { x: 2160, y: 900 } as const;
export const LANE_BORDER_WIDTH = WORLD_DIMENSIONS.borderWidth;
export const ARENA_LANES = getLaneWaypoints(BLUE_BASE_POSITION, RED_BASE_POSITION);
