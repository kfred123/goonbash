import assert from "node:assert/strict";
import { test } from "node:test";
import { getLaneWaypoints, pointAlongPath } from "shared";
import { getLaneTowerPlacements } from "./towerPlacement.js";

const blueBase = { x: 240, y: 900 };
const redBase = { x: 2160, y: 900 };

test("places two towers for each team on all three lane paths", () => {
  const placements = getLaneTowerPlacements(blueBase, redBase);
  assert.equal(placements.length, 12);

  const lanes = getLaneWaypoints(blueBase, redBase);
  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
    for (const team of ["blue", "red"] as const) {
      const pair = placements
        .filter((placement) => placement.laneIndex === laneIndex && placement.team === team)
        .sort((a, b) => a.towerIndex - b.towerIndex);
      assert.equal(pair.length, 2);
      assert.ok(Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y) > 0);

      const path = team === "blue" ? lanes[laneIndex] : [...lanes[laneIndex]].reverse();
      const totalLength = path.slice(1).reduce((distance, point, index) => (
        distance + Math.hypot(point.x - path[index].x, point.y - path[index].y)
      ), 0);
      const expectedSeparation = totalLength * 0.2;
      const actualSeparation = Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
      assert.ok(actualSeparation > 0);
      assert.ok(expectedSeparation > 0);

      const firstDistance = distanceAlongPath(pair[0], path);
      const secondDistance = distanceAlongPath(pair[1], path);
      if (firstDistance === null || secondDistance === null) throw new Error("Tower is not on its lane path");
      assert.ok(Math.abs(secondDistance - firstDistance - expectedSeparation) < 1e-6);

      for (const tower of pair) {
        const expectedPosition = pointAlongPath(path, 0.2 * (tower.towerIndex + 1));
        assert.deepEqual({ x: tower.x, y: tower.y }, expectedPosition);
      }
    }
  }
});

function distanceAlongPath(point: { x: number; y: number }, path: Array<{ x: number; y: number }>): number | null {
  let distanceBeforeSegment = 0;
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segmentLength = Math.hypot(dx, dy);
    const lengthSquared = segmentLength * segmentLength;
    const projection = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
    const nearestX = from.x + dx * projection;
    const nearestY = from.y + dy * projection;
    if (Math.hypot(point.x - nearestX, point.y - nearestY) < 1e-6) {
      return distanceBeforeSegment + segmentLength * projection;
    }
    distanceBeforeSegment += segmentLength;
  }
  return null;
}
