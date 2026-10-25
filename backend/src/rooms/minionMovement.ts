import type { Minion } from "shared";
import type { Point, WorldBounds } from "./combat.js";
import { stepToward } from "./combat.js";
import { circleContact, firstContact, resolveMovement, type CollisionBody, type MovementResult } from "./collision.js";

export interface MinionDetour {
  obstacleId: string;
  side: 1 | -1;
}

function displacementTo(from: Point, to: Point, distance: number): Point {
  const next = stepToward(from, to, distance, 0);
  return { x: next.x - from.x, y: next.y - from.y };
}

export function moveMinion(
  minion: Minion, distance: number, blockers: readonly CollisionBody[],
  bounds: WorldBounds, detours: Map<string, MinionDetour>
): MovementResult {
  const goal = { x: minion.waypointX, y: minion.waypointY };
  const direct = displacementTo(minion, goal, distance);
  const previous = detours.get(minion.id);
  let obstacle = previous ? blockers.find(body => body.id === previous.obstacleId) : undefined;
  const toGoal = { x: goal.x - minion.x, y: goal.y - minion.y };
  if (obstacle && !circleContact(minion, toGoal, minion.radius, obstacle)) obstacle = undefined;
  if (!obstacle) {
    detours.delete(minion.id);
    obstacle = firstContact(minion, direct, minion.radius, blockers, bounds)?.body;
  }
  if (!obstacle) return resolveMovement(minion, direct, minion.radius, blockers, bounds);

  const side = previous?.obstacleId === obstacle.id ? previous.side : 1;
  const angle = Math.atan2(minion.y - obstacle.y, minion.x - obstacle.x);
  const clearance = minion.radius + obstacle.radius + 4;
  for (const candidateSide of [side, -side] as const) {
    const target = {
      x: obstacle.x + Math.cos(angle + candidateSide * 0.25) * clearance,
      y: obstacle.y + Math.sin(angle + candidateSide * 0.25) * clearance
    };
    const displacement = displacementTo(minion, target, Math.min(distance, Math.hypot(toGoal.x, toGoal.y)));
    const resolved = resolveMovement(minion, displacement, minion.radius, blockers, bounds);
    if (resolved.pathDistance > 1e-6) {
      detours.set(minion.id, { obstacleId: obstacle.id, side: candidateSide > 0 ? 1 : -1 });
      return resolved;
    }
  }
  return { x: minion.x, y: minion.y, pathDistance: 0 };
}
