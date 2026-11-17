import { ARENA_LANES, WORLD_HEIGHT, WORLD_WIDTH } from "./arena";
import { isPointOnLane, LANE_ROAD_WIDTH, nearestLaneTangent } from "./lanes";
import type { LanePoint } from "./lanes";

export const BARRICADE_LENGTH = LANE_ROAD_WIDTH;
export const BARRICADE_THICKNESS = 20;

export interface BarricadePlacement extends LanePoint {
  angle: number;
  length: number;
  radius: number;
}

export type BarricadePlacementRejectionReason = "invalid_point" | "out_of_range" | "off_lane" | "overlap"
  | "unavailable" | "unlearned" | "cooldown" | "inactive";

export function barricadePointRejection(
  shooter: LanePoint,
  x: unknown,
  y: unknown,
  range: number
): "invalid_point" | "out_of_range" | "off_lane" | null {
  if (typeof x !== "number" || typeof y !== "number"
    || !Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || y < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) return "invalid_point";
  if (Math.hypot(x - shooter.x, y - shooter.y) > range) return "out_of_range";
  return isPointOnLane({ x, y }, ARENA_LANES) ? null : "off_lane";
}

export function barricadePlacementAt(point: LanePoint, lanes = ARENA_LANES): BarricadePlacement | undefined {
  const tangent = nearestLaneTangent(point, lanes);
  if (!tangent) return;
  return {
    x: point.x,
    y: point.y,
    angle: Math.atan2(tangent.y, tangent.x) + Math.PI / 2,
    length: BARRICADE_LENGTH,
    radius: BARRICADE_THICKNESS / 2
  };
}

function segmentEnds(barricade: BarricadePlacement): [LanePoint, LanePoint] {
  const halfLength = barricade.length / 2;
  const directionX = Math.cos(barricade.angle);
  const directionY = Math.sin(barricade.angle);
  return [
    { x: barricade.x - directionX * halfLength, y: barricade.y - directionY * halfLength },
    { x: barricade.x + directionX * halfLength, y: barricade.y + directionY * halfLength }
  ];
}

function pointSegmentDistance(point: LanePoint, start: LanePoint, end: LanePoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - start.x - projection * dx, point.y - start.y - projection * dy);
}

function cross(a: LanePoint, b: LanePoint, c: LanePoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isOnSegment(start: LanePoint, end: LanePoint, point: LanePoint): boolean {
  const epsilon = 1e-8;
  return point.x >= Math.min(start.x, end.x) - epsilon && point.x <= Math.max(start.x, end.x) + epsilon
    && point.y >= Math.min(start.y, end.y) - epsilon && point.y <= Math.max(start.y, end.y) + epsilon;
}

function segmentsIntersect(a: LanePoint, b: LanePoint, c: LanePoint, d: LanePoint): boolean {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if ((abC > 0 && abD < 0 || abC < 0 && abD > 0)
    && (cdA > 0 && cdB < 0 || cdA < 0 && cdB > 0)) return true;
  return abC === 0 && isOnSegment(a, b, c)
    || abD === 0 && isOnSegment(a, b, d)
    || cdA === 0 && isOnSegment(c, d, a)
    || cdB === 0 && isOnSegment(c, d, b);
}

function segmentDistance(first: [LanePoint, LanePoint], second: [LanePoint, LanePoint]): number {
  if (segmentsIntersect(first[0], first[1], second[0], second[1])) return 0;
  return Math.min(
    pointSegmentDistance(first[0], second[0], second[1]),
    pointSegmentDistance(first[1], second[0], second[1]),
    pointSegmentDistance(second[0], first[0], first[1]),
    pointSegmentDistance(second[1], first[0], first[1])
  );
}

export function barricadeOverlapsCircle(
  barricade: BarricadePlacement,
  circle: LanePoint & { radius: number }
): boolean {
  const [start, end] = segmentEnds(barricade);
  return pointSegmentDistance(circle, start, end) <= barricade.radius + circle.radius;
}

export function barricadesOverlap(first: BarricadePlacement, second: BarricadePlacement): boolean {
  const [firstStart, firstEnd] = segmentEnds(first);
  const [secondStart, secondEnd] = segmentEnds(second);
  return segmentDistance([firstStart, firstEnd], [secondStart, secondEnd]) <= first.radius + second.radius;
}
