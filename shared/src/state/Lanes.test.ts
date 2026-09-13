import assert from "node:assert/strict";
import { test } from "node:test";
import { LANE_NAMES, buildLaneWaypoints } from "./Lanes.js";

const blueTower = { x: 80, y: 300 };
const redTower = { x: 720, y: 300 };

test("there are exactly three lanes: top, mid, and bottom", () => {
  assert.deepEqual(LANE_NAMES, ["top", "mid", "bottom"]);
});

test("mid lane waypoints go straight to the enemy tower", () => {
  const waypoints = buildLaneWaypoints(blueTower, redTower, "mid");
  assert.deepEqual(waypoints, [{ x: 720, y: 300 }]);
});

test("top lane waypoints route through the lane's y offset before reaching the tower", () => {
  const waypoints = buildLaneWaypoints(blueTower, redTower, "top");
  assert.deepEqual(waypoints, [
    { x: 80, y: 100 },
    { x: 720, y: 100 },
    { x: 720, y: 300 }
  ]);
});

test("bottom lane waypoints are symmetric to top lane waypoints", () => {
  const waypoints = buildLaneWaypoints(blueTower, redTower, "bottom");
  assert.deepEqual(waypoints, [
    { x: 80, y: 500 },
    { x: 720, y: 500 },
    { x: 720, y: 300 }
  ]);
});

test("lane waypoints are symmetric when built from the other team's tower", () => {
  const waypoints = buildLaneWaypoints(redTower, blueTower, "top");
  assert.deepEqual(waypoints, [
    { x: 720, y: 100 },
    { x: 80, y: 100 },
    { x: 80, y: 300 }
  ]);
});
