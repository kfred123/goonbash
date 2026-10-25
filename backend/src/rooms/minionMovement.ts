import type { Minion } from "shared";
import type { Point, WorldBounds } from "./combat.js";
import { stepToward } from "./combat.js";
import { byId, circleContact, firstContact, isClearPosition, resolveMovement, type CollisionBody, type MovementResult } from "./collision.js";

export interface MinionDetour {
  obstacleId: string;
  side: 1 | -1;
  progress?: { bestDistance: number; attemptedDistance: number };
  escape?: Point[];
}

function displacementTo(from: Point, to: Point, distance: number): Point {
  const next = stepToward(from, to, distance, 0);
  return { x: next.x - from.x, y: next.y - from.y };
}

function clusterEscape(
  minion: Minion, goal: Point, blockers: readonly CollisionBody[], bounds: WorldBounds
): Point[] | undefined {
  const nearby = blockers.filter(body => Math.hypot(body.x - minion.x, body.y - minion.y) <= body.radius + minion.radius + 128)
    .sort((a, b) => Math.hypot(a.x - minion.x, a.y - minion.y) - Math.hypot(b.x - minion.x, b.y - minion.y) || byId(a, b))
    .slice(0, 32);
  if (!nearby.length) return;
  const clearance = minion.radius + 4;
  const left = Math.min(...nearby.map(body => body.x - body.radius - clearance));
  const right = Math.max(...nearby.map(body => body.x + body.radius + clearance));
  const top = Math.min(...nearby.map(body => body.y - body.radius - clearance));
  const bottom = Math.max(...nearby.map(body => body.y + body.radius + clearance));
  const x = Math.max(left, Math.min(right, minion.x));
  const y = Math.max(top, Math.min(bottom, minion.y));
  const candidates = [
    { x: left, y }, { x: right, y }, { x, y: top }, { x, y: bottom },
    { x: left, y: top }, { x: left, y: bottom }, { x: right, y: top }, { x: right, y: bottom }
  ].filter(point => isClearPosition(point, minion.radius, blockers, bounds));
  // Only a bounded local visibility graph is needed to back out of a concave pocket.
  const nodes: Point[] = [minion, ...candidates, goal];
  const parents = new Map<number, number>([[0, -1]]);
  const queue = [0];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const from = queue[cursor];
    for (let to = 1; to < nodes.length; to++) {
      if (parents.has(to)) continue;
      const delta = { x: nodes[to].x - nodes[from].x, y: nodes[to].y - nodes[from].y };
      if (firstContact(nodes[from], delta, minion.radius, blockers, bounds)) continue;
      parents.set(to, from);
      if (to === nodes.length - 1) {
        const path: Point[] = [];
        for (let index = to; index !== 0; index = parents.get(index)!) path.unshift(nodes[index]);
        return path;
      }
      queue.push(to);
    }
  }
}

export function moveMinion(
  minion: Minion, distance: number, blockers: readonly CollisionBody[],
  bounds: WorldBounds, detours: Map<string, MinionDetour>
): MovementResult {
  const goal = { x: minion.waypointX, y: minion.waypointY };
  const direct = displacementTo(minion, goal, distance);
  const previous = detours.get(minion.id);
  const goalDistance = Math.hypot(goal.x - minion.x, goal.y - minion.y);
  if (previous) {
    const progress = previous.progress ?? { bestDistance: goalDistance, attemptedDistance: 0 };
    previous.progress = progress;
    if (goalDistance < progress.bestDistance - minion.radius) {
      progress.bestDistance = goalDistance;
      progress.attemptedDistance = 0;
    }
    progress.attemptedDistance += Math.min(distance, goalDistance);
    if (progress.attemptedDistance > minion.radius * 8) {
      previous.escape = clusterEscape(minion, goal, blockers, bounds);
      progress.attemptedDistance = 0;
    }
    if (previous.escape) {
      if (!firstContact(minion, { x: goal.x - minion.x, y: goal.y - minion.y }, minion.radius, blockers, bounds)) {
        detours.delete(minion.id);
        return resolveMovement(minion, direct, minion.radius, blockers, bounds);
      }
      while (previous.escape.length && Math.hypot(previous.escape[0].x - minion.x, previous.escape[0].y - minion.y) < 1e-4) {
        previous.escape.shift();
      }
      const waypoint = previous.escape[0];
      if (waypoint) {
        return resolveMovement(minion, displacementTo(minion, waypoint, Math.min(distance, goalDistance)),
          minion.radius, blockers, bounds);
      }
      previous.escape = undefined;
    }
  }
  let obstacle = previous ? blockers.find(body => body.id === previous.obstacleId) : undefined;
  const toGoal = { x: goal.x - minion.x, y: goal.y - minion.y };
  if (obstacle && !circleContact(minion, toGoal, minion.radius, obstacle)) obstacle = undefined;
  if (!obstacle) {
    if (!firstContact(minion, toGoal, minion.radius, blockers, bounds)) detours.delete(minion.id);
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
      detours.set(minion.id, {
        obstacleId: obstacle.id,
        side: candidateSide > 0 ? 1 : -1,
        progress: previous?.progress ?? { bestDistance: goalDistance, attemptedDistance: 0 }
      });
      return resolved;
    }
  }
  return { x: minion.x, y: minion.y, pathDistance: 0 };
}
