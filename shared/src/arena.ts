import { getLaneWaypoints } from "./lanes";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
export const BLUE_BASE_POSITION = { x: 240, y: 900 } as const;
export const RED_BASE_POSITION = { x: 2160, y: 900 } as const;
export const LANE_BORDER_WIDTH = 124;
export const ARENA_LANES = getLaneWaypoints(BLUE_BASE_POSITION, RED_BASE_POSITION);
