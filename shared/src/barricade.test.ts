import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BARRICADE_LENGTH, BARRICADE_THICKNESS, barricadeOverlapsCircle,
  barricadePlacementAt, barricadePointRejection, barricadesOverlap
} from "./barricade.js";
import { LANE_ROAD_WIDTH } from "./lanes.js";
import { ARENA_LANES } from "./arena.js";

test("validates barricade placement bounds, range, and road position", () => {
  const tank = { x: 1000, y: 800 };
  assert.equal(barricadePointRejection(tank, 1000, 900, 100), null);
  assert.equal(barricadePointRejection(tank, 1000, 900.01, 100), "out_of_range");
  assert.equal(barricadePointRejection(tank, 1000, 1000, 200), "off_lane");
  for (const value of [NaN, Infinity, undefined, null, "900", -1, 2401]) {
    assert.equal(barricadePointRejection(tank, value, 900, 500), "invalid_point");
  }
});

test("aligns a road-width barricade perpendicular to the nearest lane segment", () => {
  const middleLane = barricadePlacementAt({ x: 1200, y: 900 });
  assert.ok(middleLane);
  assert.equal(middleLane.length, LANE_ROAD_WIDTH);
  assert.equal(middleLane.radius, BARRICADE_THICKNESS / 2);
  assert.ok(Math.abs(middleLane.angle - Math.PI / 2) < 1e-9);

  const diagonalLane = ARENA_LANES[0];
  const point = { x: 2000, y: 400 };
  const placement = barricadePlacementAt(point, [diagonalLane]);
  assert.ok(placement);
  const from = diagonalLane[2];
  const to = diagonalLane[3];
  assert.ok(Math.abs(placement.angle - (Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2)) < 1e-9);
  assert.equal(BARRICADE_LENGTH, LANE_ROAD_WIDTH);
});

test("detects overlap with circular structures and other barricades", () => {
  const first = barricadePlacementAt({ x: 1200, y: 900 })!;
  const parallel = { ...first, x: 1215 };
  const separated = { ...first, x: 1225, y: 1200 };
  assert.equal(barricadeOverlapsCircle(first, { x: 1200, y: 930, radius: 20 }), true);
  assert.equal(barricadeOverlapsCircle(first, { x: 1200, y: 1000, radius: 10 }), false);
  assert.equal(barricadesOverlap(first, parallel), true);
  assert.equal(barricadesOverlap(first, separated), false);
});
