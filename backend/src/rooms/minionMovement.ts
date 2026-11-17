import type { Minion } from "shared";
import type { Point, WorldBounds } from "./combat.js";
import { stepToward } from "./combat.js";
import {
  byId, firstContact, isBarricadeBody, isClearPosition, resolveMovement,
  type MovementBlocker, type MovementResult
} from "./collision.js";

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
  minion: Minion, goal: Point, blockers: readonly MovementBlocker[], bounds: WorldBounds
): Point[] | undefined {
  const distanceToBlocker = (point: Point, body: MovementBlocker) => {
    if (!isBarricadeBody(body)) return Math.hypot(body.x - point.x, body.y - point.y);
    const along = Math.cos(body.angle) * (point.x - body.x) + Math.sin(body.angle) * (point.y - body.y);
    const closestAlong = Math.max(-body.length / 2, Math.min(body.length / 2, along));
    const closestX = body.x + Math.cos(body.angle) * closestAlong;
    const closestY = body.y + Math.sin(body.angle) * closestAlong;
    return Math.hypot(closestX - point.x, closestY - point.y);
  };
  const nearby = blockers.filter(body => distanceToBlocker(minion, body) <= body.radius + minion.radius + 128)
    .sort((a, b) => distanceToBlocker(minion, a) - distanceToBlocker(minion, b) || byId(a, b))
    .slice(0, 32);
  if (!nearby.length) return;
  const clearance = minion.radius + 4;
  const extents = nearby.map(body => {
    const alongHalf = isBarricadeBody(body) ? body.length / 2 : 0;
    const alongX = isBarricadeBody(body) ? Math.abs(Math.cos(body.angle)) * alongHalf : 0;
    const alongY = isBarricadeBody(body) ? Math.abs(Math.sin(body.angle)) * alongHalf : 0;
    return {
      left: body.x - alongX - body.radius - clearance,
      right: body.x + alongX + body.radius + clearance,
      top: body.y - alongY - body.radius - clearance,
      bottom: body.y + alongY + body.radius + clearance
    };
  });
  const left = Math.min(...extents.map(extent => extent.left));
  const right = Math.max(...extents.map(extent => extent.right));
  const top = Math.min(...extents.map(extent => extent.top));
  const bottom = Math.max(...extents.map(extent => extent.bottom));
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
  minion: Minion, distance: number, blockers: readonly MovementBlocker[],
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
  if (obstacle && firstContact(minion, toGoal, minion.radius, [obstacle], bounds)?.body?.id !== obstacle.id) {
    obstacle = undefined;
  }
  if (!obstacle) {
    if (!firstContact(minion, toGoal, minion.radius, blockers, bounds)) detours.delete(minion.id);
    obstacle = firstContact(minion, direct, minion.radius, blockers, bounds)?.body;
  }
  if (!obstacle) return resolveMovement(minion, direct, minion.radius, blockers, bounds);

  if (isBarricadeBody(obstacle)) {
    const axisX = Math.cos(obstacle.angle);
    const axisY = Math.sin(obstacle.angle);
    const normalX = -axisY;
    const normalY = axisX;
    const relativeX = minion.x - obstacle.x;
    const relativeY = minion.y - obstacle.y;
    const across = relativeX * normalX + relativeY * normalY;
    const side = across >= 0 ? 1 : -1;
    const clearance = minion.radius + obstacle.radius + 6;
    const previousEnd = previous?.obstacleId === obstacle.id ? previous.side : undefined;
    const ends = previousEnd === undefined ? [-1, 1] as const : [previousEnd] as const;
    const targets = ends.map(end => ({
      end,
      target: {
        x: obstacle.x + axisX * end * (obstacle.length / 2 + clearance) + normalX * side * clearance,
        y: obstacle.y + axisY * end * (obstacle.length / 2 + clearance) + normalY * side * clearance
      }
    }));
    targets.sort((a, b) =>
      Math.hypot(a.target.x - minion.x, a.target.y - minion.y)
      - Math.hypot(b.target.x - minion.x, b.target.y - minion.y));
    const { end, target } = targets[0];
    detours.set(minion.id, {
      obstacleId: obstacle.id,
      side: end,
      progress: previous?.progress ?? { bestDistance: goalDistance, attemptedDistance: 0 }
    });
    return resolveMovement(minion, displacementTo(minion, target, Math.min(distance, goalDistance)),
      minion.radius, blockers, bounds);
  }

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
