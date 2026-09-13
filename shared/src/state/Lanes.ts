export type LaneName = "top" | "mid" | "bottom";

export const LANE_NAMES: LaneName[] = ["top", "mid", "bottom"];

/** Vertical offset (in world units) applied to a tower's y position to get a lane's y coordinate. */
export const LANE_Y_OFFSET: Record<LaneName, number> = {
  top: -200,
  mid: 0,
  bottom: 200
};

export interface Point {
  x: number;
  y: number;
}

/**
 * Builds the ordered list of waypoints a mob spawned at `from` on the given lane
 * SHALL walk through to reach the enemy tower at `to`. The final waypoint is
 * always the enemy tower's position.
 */
export function buildLaneWaypoints(from: Point, to: Point, lane: LaneName): Point[] {
  const laneY = from.y + LANE_Y_OFFSET[lane];
  const waypoints: Point[] = [];
  if (from.y !== laneY) waypoints.push({ x: from.x, y: laneY });
  waypoints.push({ x: to.x, y: laneY });
  if (to.y !== laneY) waypoints.push({ x: to.x, y: to.y });
  return waypoints;
}
