import { ARENA_LANES, LANE_BORDER_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./arena";
import { isPointOnLane, LanePoint } from "./lanes";

type Interval = [number, number];

interface RoadSegment {
  from: LanePoint;
  to: LanePoint;
  length: number;
  ux: number;
  uy: number;
}

/** The road union includes the rendered border, round joins, and endpoint caps. */
export class VisionTerrain {
  private readonly segments: RoadSegment[];

  constructor(
    readonly lanes: LanePoint[][] = ARENA_LANES,
    readonly width = LANE_BORDER_WIDTH,
    readonly worldWidth = WORLD_WIDTH,
    readonly worldHeight = WORLD_HEIGHT
  ) {
    this.segments = lanes.flatMap((lane) => lane.slice(1).map((to, index) => {
      const from = lane[index];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      return { from, to, length, ux: length ? (to.x - from.x) / length : 1, uy: length ? (to.y - from.y) / length : 0 };
    }));
  }

  contains(point: LanePoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y)
      && point.x >= 0 && point.y >= 0 && point.x <= this.worldWidth && point.y <= this.worldHeight;
  }

  isGrass(point: LanePoint): boolean {
    return !isPointOnLane(point, this.lanes, this.width);
  }

  sightCost(from: LanePoint, to: LanePoint): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return 0;
    const intervals: Interval[] = [];
    const radius = this.width / 2;
    const circle = (center: LanePoint) => {
      const ox = from.x - center.x;
      const oy = from.y - center.y;
      const a = distance * distance;
      const b = ox * dx + oy * dy;
      const c = ox * ox + oy * oy - radius * radius;
      const discriminant = b * b - a * c;
      if (discriminant < 0) return;
      const root = Math.sqrt(discriminant);
      const start = Math.max(0, (-b - root) / a);
      const end = Math.min(1, (-b + root) / a);
      if (start <= end) intervals.push([start, end]);
    };
    for (const segment of this.segments) {
      // Reject corridors whose bounding box cannot intersect this ray.
      if (Math.max(from.x, to.x) < Math.min(segment.from.x, segment.to.x) - radius
        || Math.min(from.x, to.x) > Math.max(segment.from.x, segment.to.x) + radius
        || Math.max(from.y, to.y) < Math.min(segment.from.y, segment.to.y) - radius
        || Math.min(from.y, to.y) > Math.max(segment.from.y, segment.to.y) + radius) continue;
      const ox = from.x - segment.from.x;
      const oy = from.y - segment.from.y;
      let start = 0;
      let end = 1;
      const clip = (origin: number, delta: number, min: number, max: number) => {
        if (Math.abs(delta) < 1e-12) return origin >= min && origin <= max;
        const a = (min - origin) / delta;
        const b = (max - origin) / delta;
        start = Math.max(start, Math.min(a, b));
        end = Math.min(end, Math.max(a, b));
        return start <= end;
      };
      if (clip(ox * segment.ux + oy * segment.uy, dx * segment.ux + dy * segment.uy, 0, segment.length)
        && clip(-ox * segment.uy + oy * segment.ux, -dx * segment.uy + dy * segment.ux, -radius, radius)) {
        intervals.push([start, end]);
      }
      circle(segment.from);
      circle(segment.to);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    let roadFraction = 0;
    let end = 0;
    for (const interval of intervals) {
      if (interval[1] > end) {
        roadFraction += interval[1] - Math.max(end, interval[0]);
        end = interval[1];
      }
    }
    return distance * (2 - Math.min(1, roadFraction));
  }
}

export const ARENA_VISION_TERRAIN = new VisionTerrain();

export interface VisionEntity extends LanePoint {
  team: string;
  hp: number;
  state?: string;
  sightRange: number;
}

export interface VisionWorld {
  tanks: { values(): IterableIterator<VisionEntity> };
  minions: { values(): IterableIterator<VisionEntity> };
  towers: { values(): IterableIterator<VisionEntity> };
  bases: { values(): IterableIterator<VisionEntity> };
}

export function getVisionEntities(world: VisionWorld): VisionEntity[] {
  return [...world.tanks.values(), ...world.minions.values(), ...world.towers.values(), ...world.bases.values()];
}

export interface VisionObserver extends LanePoint {
  budget: number;
}

/** Immutable position snapshot; rebuild after any state change affecting observers. */
export class TeamVision {
  readonly observers: VisionObserver[];

  constructor(
    readonly team: string,
    entities: Iterable<VisionEntity>,
    readonly terrain = ARENA_VISION_TERRAIN
  ) {
    this.observers = [];
    if (team !== "blue" && team !== "red") {
      this.team = "";
      return;
    }
    for (const entity of entities) {
      if (entity.team !== team || entity.hp <= 0 || entity.state === "dead"
        || !terrain.contains(entity) || !Number.isFinite(entity.sightRange) || entity.sightRange <= 0) continue;
      this.observers.push({
        x: entity.x,
        y: entity.y,
        budget: entity.sightRange * (terrain.isGrass(entity) ? 0.5 : 1)
      });
    }
  }

  canSee(point: LanePoint): boolean {
    if (!this.terrain.contains(point)) return false;
    return this.observers.some((observer) => this.observerCanSee(observer, point));
  }

  observerCanSee(observer: VisionObserver, point: LanePoint): boolean {
    const distance = Math.hypot(point.x - observer.x, point.y - observer.y);
    return distance <= observer.budget + 1e-7
      && this.terrain.sightCost(observer, point) <= observer.budget + 1e-7;
  }
}

export const INVALID_TARGET_MESSAGE = "action_rejected";
export interface InvalidTargetMessage {
  action: "attack" | "rocket";
  reason: "invalid_target";
}
