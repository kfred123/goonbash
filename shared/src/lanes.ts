import { WORLD_DIMENSIONS } from "./worldScale";

export interface LanePoint {
  x: number;
  y: number;
}

export const LANE_EDGE_Y = WORLD_DIMENSIONS.laneRows;
export const LANE_TURN_X = [750, 1650] as const;
export const LANE_ROAD_WIDTH = WORLD_DIMENSIONS.roadWidth;

/** Returns whether a point falls within the rendered stone width of any lane path. */
export function isPointOnLane(point: LanePoint, lanes: LanePoint[][], roadWidth = LANE_ROAD_WIDTH): boolean {
  return lanes.some((lane) => lane.slice(1).some((to, index) => {
    const from = lane[index];
    const segmentX = to.x - from.x;
    const segmentY = to.y - from.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const projection = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - from.x) * segmentX + (point.y - from.y) * segmentY) / segmentLengthSquared));
    const closestX = from.x + projection * segmentX;
    const closestY = from.y + projection * segmentY;
    return Math.hypot(point.x - closestX, point.y - closestY) <= roadWidth / 2;
  }));
}

/**
 * Builds the original lane waypoints from one base to its opponent.
 * The source base is intentionally omitted because moving units start there.
 */
export function buildLanePath(fromBase: LanePoint, toBase: LanePoint, laneEdgeY: number): LanePoint[] {
  if (laneEdgeY === fromBase.y) {
    return [{ x: toBase.x, y: toBase.y }];
  }
  const movingRight = fromBase.x < toBase.x;
  const [nearTurnX, farTurnX] = movingRight
    ? LANE_TURN_X
    : [...LANE_TURN_X].reverse();
  return [
    { x: nearTurnX, y: laneEdgeY },
    { x: farTurnX, y: laneEdgeY },
    { x: toBase.x, y: toBase.y }
  ];
}

/** Returns each lane's complete ordered waypoint list from blue base to red base. */
export function getLaneWaypoints(blueBase: LanePoint, redBase: LanePoint): LanePoint[][] {
  return LANE_EDGE_Y.map((laneEdgeY) => [
    { x: blueBase.x, y: blueBase.y },
    ...buildLanePath(blueBase, redBase, laneEdgeY)
  ]);
}

/** Finds a point at a fractional distance along a polyline. */
export function pointAlongPath(path: LanePoint[], fraction: number): LanePoint {
  if (path.length === 0) throw new Error("Cannot find a point along an empty path");
  if (path.length === 1) return { ...path[0] };
  if (path.every((point) => point.x === path[0].x && point.y === path[0].y)) return { ...path[0] };
  return samplePathWithTangent(path, fraction).point;
}

/** Samples the incoming non-zero segment at a vertex, including its unit tangent. */
export function samplePathWithTangent(path: LanePoint[], fraction: number): { point: LanePoint; tangent: LanePoint } {
  if (!Number.isFinite(fraction) || path.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new Error("Cannot sample non-finite lane geometry");
  }
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const lengths: number[] = [];
  let totalLength = 0;
  let lastSegmentIndex = -1;
  for (let index = 1; index < path.length; index += 1) {
    const length = Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y);
    lengths.push(length);
    totalLength += length;
    if (length > 0) lastSegmentIndex = index - 1;
  }
  if (!Number.isFinite(totalLength) || totalLength === 0) throw new Error("Cannot sample a lane without a non-zero segment");
  let remaining = totalLength * clampedFraction;
  for (let index = 0; index < lengths.length; index += 1) {
    const segmentLength = lengths[index];
    if (segmentLength === 0) continue;
    if (remaining <= segmentLength || index === lastSegmentIndex) {
      const from = path[index];
      const to = path[index + 1];
      const segmentFraction = Math.min(1, remaining / segmentLength);
      return {
        point: {
          x: from.x + (to.x - from.x) * segmentFraction,
          y: from.y + (to.y - from.y) * segmentFraction
        },
        tangent: { x: (to.x - from.x) / segmentLength, y: (to.y - from.y) / segmentLength }
      };
    }
    remaining -= segmentLength;
  }
  throw new Error("Cannot locate a segment in lane geometry");
}
