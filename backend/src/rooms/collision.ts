import { Tank, type GameState, type Minion } from "shared";
import type { Point, WorldBounds } from "./combat.js";

export interface CollisionBody extends Point {
  id: string;
  radius: number;
}

export interface BarricadeBody extends CollisionBody {
  angle: number;
  length: number;
}

export type MovementBlocker = CollisionBody | BarricadeBody;

export function isBarricadeBody(body: MovementBlocker): body is BarricadeBody {
  return "angle" in body && "length" in body;
}

export interface MovementResult extends Point {
  pathDistance: number;
}

interface Contact {
  time: number;
  normal: Point;
  body?: MovementBlocker;
}

// Separation assertions tolerate 1e-4 world units; keep the solver well below it.
export const COLLISION_TOLERANCE = 1e-4;
const EPSILON = 1e-7;
const MAX_CONTACTS = 8;

export function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function movementBlockers(
  unit: Tank | Minion,
  world: Pick<GameState, "tanks" | "minions" | "towers" | "bases" | "barricades">
): MovementBlocker[] {
  const mobile = unit instanceof Tank
    ? [...world.tanks.values()].filter(tank => tank.state === "alive" && tank.hp > 0)
    : [...world.minions.values()].filter(minion => minion.hp > 0);
  return [
    ...mobile.filter(other => other.id !== unit.id),
    ...[...world.towers.values(), ...world.bases.values()].filter(structure => structure.hp > 0),
    ...[...world.barricades.values()].filter(barricade => barricade.hp > 0)
  ].sort(byId);
}

export function isClearPosition(
  point: Point, radius: number, blockers: readonly MovementBlocker[], bounds: WorldBounds
): boolean {
  return point.x >= bounds.minX + radius && point.x <= bounds.maxX - radius
    && point.y >= bounds.minY + radius && point.y <= bounds.maxY - radius
    && blockers.every(body => {
      if (!isBarricadeBody(body)) return Math.hypot(point.x - body.x, point.y - body.y) >= radius + body.radius;
      const axisX = Math.cos(body.angle);
      const axisY = Math.sin(body.angle);
      const relativeX = point.x - body.x;
      const relativeY = point.y - body.y;
      const along = Math.max(-body.length / 2, Math.min(body.length / 2, relativeX * axisX + relativeY * axisY));
      const closestX = body.x + along * axisX;
      const closestY = body.y + along * axisY;
      return Math.hypot(point.x - closestX, point.y - closestY) >= radius + body.radius;
    });
}

export function circleContact(
  point: Point, displacement: Point, radius: number, body: CollisionBody
): Contact | undefined {
  const x = point.x - body.x;
  const y = point.y - body.y;
  const lengthSquared = displacement.x ** 2 + displacement.y ** 2;
  if (lengthSquared <= EPSILON ** 2) return;
  const dot = x * displacement.x + y * displacement.y;
  if (dot >= 0) return;
  const combined = radius + body.radius;
  const gap = x * x + y * y - combined * combined;
  const discriminant = dot * dot - lengthSquared * gap;
  if (discriminant <= 0) return;
  const time = gap <= 0 ? 0 : (-dot - Math.sqrt(discriminant)) / lengthSquared;
  if (time < 0 || time > 1) return;
  const nx = x + displacement.x * time;
  const ny = y + displacement.y * time;
  const distance = Math.hypot(nx, ny);
  if (distance <= EPSILON) return;
  return { time, normal: { x: nx / distance, y: ny / distance }, body };
}

function barricadeContact(
  point: Point, displacement: Point, unitRadius: number, barricade: BarricadeBody
): Contact | undefined {
  const axisX = Math.cos(barricade.angle);
  const axisY = Math.sin(barricade.angle);
  const normalX = -axisY;
  const normalY = axisX;
  const relativeX = point.x - barricade.x;
  const relativeY = point.y - barricade.y;
  const along = relativeX * axisX + relativeY * axisY;
  const across = relativeX * normalX + relativeY * normalY;
  const alongStep = displacement.x * axisX + displacement.y * axisY;
  const acrossStep = displacement.x * normalX + displacement.y * normalY;
  const combinedRadius = unitRadius + barricade.radius;
  const halfLength = barricade.length / 2;
  let first: Contact | undefined;
  const consider = (time: number, normal: Point) => {
    if (time < 0 || time > 1 || displacement.x * normal.x + displacement.y * normal.y >= 0) return;
    if (!first || time < first.time) first = { time, normal, body: barricade };
  };

  if (Math.abs(along) <= halfLength && Math.abs(across) < combinedRadius) {
    const side = across > 0 ? 1 : across < 0 ? -1 : acrossStep > 0 ? -1 : 1;
    consider(0, { x: normalX * side, y: normalY * side });
  }
  if (acrossStep !== 0) {
    for (const side of [-1, 1]) {
      if (acrossStep * side >= 0) continue;
      const time = (side * combinedRadius - across) / acrossStep;
      if (Math.abs(along + alongStep * time) <= halfLength + COLLISION_TOLERANCE) {
        consider(time, { x: normalX * side, y: normalY * side });
      }
    }
  }

  const endpoint = (alongOffset: number) => ({
    id: barricade.id,
    x: barricade.x + axisX * alongOffset,
    y: barricade.y + axisY * alongOffset,
    radius: combinedRadius
  });
  for (const offset of [-halfLength, halfLength]) {
    const contact = circleContact(point, displacement, 0, endpoint(offset));
    if (contact) consider(contact.time, contact.normal);
  }
  return first;
}

export function firstContact(
  point: Point, displacement: Point, radius: number,
  blockers: readonly MovementBlocker[], bounds: WorldBounds
): Contact | undefined {
  let first: Contact | undefined;
  const consider = (contact: Contact | undefined) => {
    if (contact && contact.time >= 0 && contact.time <= 1 && (!first || contact.time < first.time)) {
      first = contact;
    }
  };
  for (const body of blockers) {
    consider(isBarricadeBody(body)
      ? barricadeContact(point, displacement, radius, body)
      : circleContact(point, displacement, radius, body));
  }
  if (displacement.x < 0) {
    consider({ time: (bounds.minX + radius - point.x) / displacement.x, normal: { x: 1, y: 0 } });
  } else if (displacement.x > 0) {
    consider({ time: (bounds.maxX - radius - point.x) / displacement.x, normal: { x: -1, y: 0 } });
  }
  if (displacement.y < 0) {
    consider({ time: (bounds.minY + radius - point.y) / displacement.y, normal: { x: 0, y: 1 } });
  } else if (displacement.y > 0) {
    consider({ time: (bounds.maxY - radius - point.y) / displacement.y, normal: { x: 0, y: -1 } });
  }
  return first;
}

export function resolveMovement(
  start: Point, displacement: Point, radius: number,
  blockers: readonly MovementBlocker[], bounds: WorldBounds
): MovementResult {
  const point = { x: start.x, y: start.y, pathDistance: 0 };
  let remaining = { ...displacement };
  for (let iteration = 0; iteration < MAX_CONTACTS; iteration++) {
    const length = Math.hypot(remaining.x, remaining.y);
    if (length <= EPSILON) break;
    const contact = firstContact(point, remaining, radius, blockers, bounds);
    const fraction = contact ? Math.max(0, contact.time - EPSILON / length) : 1;
    point.x += remaining.x * fraction;
    point.y += remaining.y * fraction;
    point.pathDistance += length * fraction;
    if (!contact) break;
    remaining = { x: remaining.x * (1 - fraction), y: remaining.y * (1 - fraction) };
    const inward = remaining.x * contact.normal.x + remaining.y * contact.normal.y;
    if (inward < 0) {
      remaining.x -= inward * contact.normal.x;
      remaining.y -= inward * contact.normal.y;
    }
  }
  return point;
}

export function findClearNearBase(
  base: Point, radius: number, blockers: readonly MovementBlocker[], bounds: WorldBounds,
  preferred?: Point
): Point | undefined {
  const valid = (point: Point) => {
    const distance = Math.hypot(point.x - base.x, point.y - base.y);
    return distance >= 80 && distance <= 140 + EPSILON && isClearPosition(point, radius, blockers, bounds);
  };
  if (preferred && valid(preferred)) return { x: preferred.x, y: preferred.y };
  for (let attempt = 0; attempt < 8; attempt++) {
    const distance = 80 + Math.random() * 60;
    const angle = Math.random() * Math.PI * 2;
    const point = { x: base.x + Math.cos(angle) * distance, y: base.y + Math.sin(angle) * distance };
    if (valid(point)) return point;
  }
  for (const distance of [80, 100, 120, 140]) {
    for (let index = 0; index < 48; index++) {
      const angle = index * Math.PI / 24;
      const point = { x: base.x + Math.cos(angle) * distance, y: base.y + Math.sin(angle) * distance };
      if (valid(point)) return point;
    }
  }
}

export function findLaneSpawn(
  base: CollisionBody, waypoint: Point, radius: number,
  blockers: readonly MovementBlocker[], bounds: WorldBounds
): Point | undefined {
  const angle = Math.atan2(waypoint.y - base.y, waypoint.x - base.x);
  for (const distance of [base.radius + radius + 8, 90, 115, 140]) {
    for (const offset of [0, 0.3, -0.3, 0.6, -0.6]) {
      const point = {
        x: base.x + Math.cos(angle + offset) * distance,
        y: base.y + Math.sin(angle + offset) * distance
      };
      if (isClearPosition(point, radius, blockers, bounds)) return point;
    }
  }
}
