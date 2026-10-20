import assert from "node:assert/strict";
import { test } from "node:test";
import { VisionEntity, VisionTerrain, TeamVision } from "./vision.js";
import { Base } from "./state/Base.js";
import { Tower } from "./state/Tower.js";
import { Tank } from "./state/Tank.js";
import { Minion } from "./state/Minion.js";
import { ROLE_STATS } from "./roles.js";

const road = new VisionTerrain([[{ x: 100, y: 500 }, { x: 1000, y: 500 }]], 100);
const observer = (overrides: Partial<VisionEntity> = {}): VisionEntity => ({
  x: 300, y: 500, team: "blue", hp: 100, sightRange: 200, ...overrides
});

test("absolute sight defaults are independent of combat stats", () => {
  assert.deepEqual([ROLE_STATS.healer.sightRange, ROLE_STATS.tank.sightRange, ROLE_STATS.damagedealer.sightRange], [325, 325, 325]);
  for (const [unit, sight] of [[new Tank(), 325], [new Minion(), 130], [new Tower(), 325], [new Base(), 325]] as const) {
    assert.equal(unit.sightRange, sight);
    unit.fireRange *= 2;
    assert.equal(unit.sightRange, sight);
  }
});

test("every player role matches tower sight on roads and with the unchanged grass penalties", () => {
  for (const stats of [...Object.values(ROLE_STATS), new Tank(), new Tower()]) {
    const onRoad = new TeamVision("blue", [observer({ sightRange: stats.sightRange })], road);
    assert.equal(onRoad.canSee({ x: 625, y: 500 }), true);
    assert.equal(onRoad.canSee({ x: 625.001, y: 500 }), false);
    const inGrass = new TeamVision("blue", [observer({ x: 300, y: 700, sightRange: stats.sightRange })], road);
    assert.equal(inGrass.canSee({ x: 381.25, y: 700 }), true);
    assert.equal(inGrass.canSee({ x: 381.251, y: 700 }), false);
  }
});

test("road sides and round caps are closed non-grass terrain", () => {
  for (const point of [{ x: 300, y: 550 }, { x: 50, y: 500 }, { x: 1050, y: 500 }]) {
    assert.equal(road.isGrass(point), false);
  }
  assert.equal(road.isGrass({ x: 300, y: 550.001 }), true);
  assert.equal(road.isGrass({ x: 49.999, y: 500 }), true);
  assert.equal(road.contains({ x: -1, y: 0 }), false);
  assert.equal(road.contains({ x: NaN, y: 0 }), false);
  assert.equal(road.sightCost({ x: 200, y: 500 }, { x: 200, y: 500 }), 0);
});

test("capsule intersections account for sides, tangents, caps and zero-length roads", () => {
  assert.equal(road.sightCost({ x: 300, y: 500 }, { x: 300, y: 600 }), 150);
  assert.equal(road.sightCost({ x: 50, y: 500 }, { x: 150, y: 500 }), 100);
  assert.equal(road.sightCost({ x: 300, y: 550 }, { x: 400, y: 550 }), 100);
  const circle = new VisionTerrain([[{ x: 500, y: 500 }, { x: 500, y: 500 }]], 100);
  assert.equal(circle.sightCost({ x: 400, y: 500 }, { x: 600, y: 500 }), 300);
  assert.equal(circle.sightCost({ x: 400, y: 550 }, { x: 600, y: 550 }), 400);
});

test("road overlap and joins are counted once and diagonal rays are symmetric", () => {
  const terrain = new VisionTerrain([
    [{ x: 100, y: 500 }, { x: 1000, y: 500 }],
    [{ x: 300, y: 100 }, { x: 300, y: 1000 }]
  ], 100);
  assert.equal(terrain.sightCost({ x: 200, y: 500 }, { x: 400, y: 500 }), 200);
  const a = { x: 100, y: 100 };
  const b = { x: 500, y: 700 };
  assert.ok(Math.abs(terrain.sightCost(a, b) - terrain.sightCost(b, a)) < 1e-7);
  const diagonal = new VisionTerrain([[a, b]], 100);
  assert.ok(Math.abs(diagonal.sightCost(a, b) - Math.hypot(400, 600)) < 1e-7);
});

test("200-unit road sight includes the boundary only", () => {
  const vision = new TeamVision("blue", [observer()], road);
  assert.equal(vision.canSee({ x: 500, y: 500 }), true);
  assert.equal(vision.canSee({ x: 500.001, y: 500 }), false);
  assert.equal(vision.canSee({ x: -1, y: 500 }), false);
});

test("80 road units plus 60 grass units exhaust a 200-unit budget", () => {
  const terrain = new VisionTerrain([[{ x: 100, y: 500 }, { x: 330, y: 500 }]], 100);
  const vision = new TeamVision("blue", [observer()], terrain);
  assert.equal(vision.canSee({ x: 440, y: 500 }), true);
  assert.equal(vision.canSee({ x: 440.001, y: 500 }), false);
});

test("standing in grass additionally halves budget, giving quarter range on grass", () => {
  const vision = new TeamVision("blue", [observer({ x: 300, y: 700 })], road);
  assert.equal(vision.canSee({ x: 350, y: 700 }), true);
  assert.equal(vision.canSee({ x: 350.001, y: 700 }), false);
});

test("intervening grass consumes budget even when the target stands on road", () => {
  const terrain = new VisionTerrain([
    [{ x: 100, y: 100 }, { x: 300, y: 100 }],
    [{ x: 100, y: 250 }, { x: 300, y: 250 }]
  ], 20);
  const vision = new TeamVision("blue", [observer({ x: 200, y: 100 })], terrain);
  assert.equal(terrain.isGrass({ x: 200, y: 250 }), false);
  assert.equal(vision.canSee({ x: 200, y: 250 }), false);
});

test("teams share living observers, snapshots rebuild after movement, death and respawn", () => {
  const scout = observer();
  const distantAlly = observer({ x: 800 });
  const enemy = observer({ x: 700, team: "red", sightRange: 1000 });
  const entities = [scout, distantAlly, enemy];
  const snapshot = new TeamVision("blue", entities, road);
  assert.equal(snapshot.canSee({ x: 900, y: 500 }), true);
  distantAlly.state = "dead";
  assert.equal(new TeamVision("blue", entities, road).canSee({ x: 900, y: 500 }), false);
  distantAlly.state = "alive";
  distantAlly.hp = 0;
  assert.equal(new TeamVision("blue", entities, road).canSee({ x: 900, y: 500 }), false);
  distantAlly.hp = 100;
  distantAlly.x = 400;
  assert.equal(snapshot.canSee({ x: 900, y: 500 }), true);
  assert.equal(new TeamVision("blue", entities, road).canSee({ x: 900, y: 500 }), false);
  assert.equal(new TeamVision("", entities, road).canSee(scout), false);
  assert.equal(new TeamVision("neutral", entities, road).team, "");
  assert.equal(new TeamVision("blue", [], road).canSee(scout), false);
});
