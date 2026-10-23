import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARENA_LANES, BLUE_BASE_POSITION, RED_BASE_POSITION, getLaneWaypoints, pointAlongPath,
  isPointOnLane, LANE_BORDER_WIDTH, TOWER_FOOTPRINT_RADIUS, WORLD_WIDTH, WORLD_HEIGHT, WORLD_SCALE
} from "shared";
import { getLaneTowerPlacements, TOWER_GRASS_GAP, TOWER_LATERAL_OFFSET } from "./towerPlacement.js";

const blueBase = BLUE_BASE_POSITION;
const redBase = RED_BASE_POSITION;
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test("places 24 deterministic towers in same-team opposing grass pairs at existing checkpoints", () => {
  const placements = getLaneTowerPlacements(blueBase, redBase);
  assert.equal(placements.length, 24);
  assert.deepEqual(placements, getLaneTowerPlacements(blueBase, redBase));
  assert.equal(new Set(placements.map(({ x, y }) => `${x},${y}`)).size, 24);
  const lanes = getLaneWaypoints(blueBase, redBase);
  assert.deepEqual(lanes, ARENA_LANES);
  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
    for (const team of ["blue", "red"] as const) {
      const towers = placements.filter(tower => tower.laneIndex === laneIndex && tower.team === team);
      assert.equal(towers.length, 4);
      const path = team === "blue" ? lanes[laneIndex] : [...lanes[laneIndex]].reverse();
      for (const towerIndex of [0, 1]) {
        const pair = towers.filter(tower => tower.towerIndex === towerIndex);
        assert.deepEqual(pair.map(tower => tower.side), ["left", "right"]);
        const anchor = pointAlongPath(path, [0.2, 0.4][towerIndex]);
        close((pair[0].x + pair[1].x) / 2, anchor.x);
        close((pair[0].y + pair[1].y) / 2, anchor.y);
        const canonicalFraction = team === "blue" ? [0.2, 0.4][towerIndex] : 1 - [0.2, 0.4][towerIndex];
        const before = pointAlongPath(lanes[laneIndex], canonicalFraction - 0.0001);
        const after = pointAlongPath(lanes[laneIndex], canonicalFraction + 0.0001);
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        for (const tower of pair) {
          close(Math.hypot(tower.x - anchor.x, tower.y - anchor.y), TOWER_LATERAL_OFFSET);
          close((tower.x - anchor.x) * dx + (tower.y - anchor.y) * dy, 0);
          const cross = dx * (tower.y - anchor.y) - dy * (tower.x - anchor.x);
          assert.ok(tower.side === "left" ? cross < 0 : cross > 0);
        }
      }
    }
  }
});

test("full scaled tower footprints clear every road including borders and stay in world bounds", () => {
  assert.ok(TOWER_GRASS_GAP > 0);
  for (const tower of getLaneTowerPlacements(blueBase, redBase)) {
    assert.ok(tower.x >= TOWER_FOOTPRINT_RADIUS && tower.x <= WORLD_WIDTH - TOWER_FOOTPRINT_RADIUS);
    assert.ok(tower.y >= TOWER_FOOTPRINT_RADIUS && tower.y <= WORLD_HEIGHT - TOWER_FOOTPRINT_RADIUS);
    assert.equal(isPointOnLane(tower, ARENA_LANES, LANE_BORDER_WIDTH + 2 * (TOWER_FOOTPRINT_RADIUS + TOWER_GRASS_GAP / 2)), false);
  }
});

test("footprint encloses stroked foundation, rotating cannon, ruin and server radius", () => {
  for (const [x, y] of [[22, 22], [-22, -18], [22, 4.5], [19.5, 13.5]]) {
    assert.ok(Math.hypot(x, y) * WORLD_SCALE.entity <= TOWER_FOOTPRINT_RADIUS);
  }
  assert.ok(TOWER_FOOTPRINT_RADIUS >= 24);
  close(TOWER_LATERAL_OFFSET - LANE_BORDER_WIDTH / 2 - TOWER_FOOTPRINT_RADIUS, TOWER_GRASS_GAP);
});

test("invalid placement fails explicitly instead of clamping towers onto a road or outside the map", () => {
  assert.throws(() => getLaneTowerPlacements({ x: 240, y: 0 }, { x: 2160, y: 0 }), /not on in-bounds grass/);
  assert.throws(() => getLaneTowerPlacements({ x: NaN, y: 900 }, redBase), /non-finite/);
});
