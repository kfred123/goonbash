import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLanePath, getLaneWaypoints, isPointOnLane, pointAlongPath, LANE_EDGE_Y, LANE_TURN_X, LANE_ROAD_WIDTH } from "./lanes.js";
import { ARENA_LANES, BLUE_BASE_POSITION, RED_BASE_POSITION, WORLD_WIDTH, WORLD_HEIGHT, LANE_BORDER_WIDTH } from "./arena.js";

const blueBase = { x: 240, y: 900 };
const redBase = { x: 2160, y: 900 };

test("builds the same lane waypoints as the original room path builder", () => {
  assert.deepEqual(buildLanePath(blueBase, redBase, 150), [
    { x: 750, y: 150 },
    { x: 1650, y: 150 },
    { x: 2160, y: 900 }
  ]);
  assert.deepEqual(buildLanePath(blueBase, redBase, 900), [{ x: 2160, y: 900 }]);
  assert.deepEqual(buildLanePath(blueBase, redBase, 1650), [
    { x: 750, y: 1650 },
    { x: 1650, y: 1650 },
    { x: 2160, y: 900 }
  ]);
  assert.deepEqual(buildLanePath(redBase, blueBase, 150), [
    { x: 1650, y: 150 },
    { x: 750, y: 150 },
    { x: 240, y: 900 }
  ]);
});

test("returns complete blue-to-red paths including both base endpoints", () => {
  const lanes = getLaneWaypoints(blueBase, redBase);
  assert.equal(lanes.length, 3);
  assert.deepEqual(lanes[0], [
    blueBase,
    { x: 750, y: LANE_EDGE_Y[0] },
    { x: 1650, y: LANE_EDGE_Y[0] },
    redBase
  ]);
  assert.deepEqual(lanes[1], [blueBase, redBase]);
});

test("interpolates by distance along each segment", () => {
  assert.deepEqual(pointAlongPath([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }], 0.5), {
    x: 3,
    y: 0.5
  });
});

test("classifies points inside the rendered lane width as lane terrain", () => {
  const lanes = getLaneWaypoints(blueBase, redBase);
  assert.equal(isPointOnLane({ x: 1200, y: 900 }, lanes), true);
  assert.equal(isPointOnLane({ x: 1200, y: 955 }, lanes), true);
  assert.equal(isPointOnLane({ x: 1200, y: 977 }, lanes), true);
  assert.equal(isPointOnLane({ x: 1200, y: 978 }, lanes), false);
  assert.equal(isPointOnLane({ x: 1200, y: 700 }, lanes), false);
});

test("default lane geometry preserves bounds, anchors, turns, and mirrored traversal", () => {
  assert.deepEqual([WORLD_WIDTH, WORLD_HEIGHT], [2400, 1800]);
  assert.deepEqual(BLUE_BASE_POSITION, blueBase);
  assert.deepEqual(RED_BASE_POSITION, redBase);
  assert.deepEqual(LANE_TURN_X, [750, 1650]);
  assert.ok(Math.abs(LANE_ROAD_WIDTH - 154.56) < 1e-9);
  assert.ok(Math.abs(LANE_BORDER_WIDTH - 171.12) < 1e-9);
  for (let index = 0; index < 3; index += 1) {
    assert.ok(Math.abs(LANE_EDGE_Y[index] - [165.48, 900, 1634.52][index]) < 1e-9);
    assert.deepEqual(getLaneWaypoints(redBase, blueBase)[index], [...ARENA_LANES[index]].reverse());
    if (index > 0) {
      assert.ok(Math.abs(LANE_EDGE_Y[index] - LANE_EDGE_Y[index - 1] - LANE_BORDER_WIDTH - 563.4) < 1e-9);
    }
  }
});
