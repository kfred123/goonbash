import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLanePath, getLaneWaypoints, pointAlongPath } from "./lanes.js";

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
    { x: 750, y: 150 },
    { x: 1650, y: 150 },
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
