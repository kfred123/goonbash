export interface LanePoint {
  x: number;
  y: number;
}

export const LANE_EDGE_Y = [150, 900, 1650] as const;
export const LANE_TURN_X = [750, 1650] as const;

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

  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const lengths: number[] = [];
  let totalLength = 0;
  for (let index = 1; index < path.length; index += 1) {
    const length = Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y);
    lengths.push(length);
    totalLength += length;
  }
  let remaining = totalLength * clampedFraction;
  for (let index = 0; index < lengths.length; index += 1) {
    const segmentLength = lengths[index];
    if (remaining <= segmentLength || index === lengths.length - 1) {
      const from = path[index];
      const to = path[index + 1];
      const segmentFraction = segmentLength === 0 ? 0 : Math.min(1, remaining / segmentLength);
      return {
        x: from.x + (to.x - from.x) * segmentFraction,
        y: from.y + (to.y - from.y) * segmentFraction
      };
    }
    remaining -= segmentLength;
  }
  return { ...path[path.length - 1] };
}
