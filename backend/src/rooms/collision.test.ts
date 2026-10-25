import assert from "node:assert/strict";
import { test } from "node:test";
import { Base, GameState, Minion, Tank, Tower } from "shared";
import {
  COLLISION_TOLERANCE, findClearNearBase, findLaneSpawn, isClearPosition,
  movementBlockers, resolveMovement, type CollisionBody
} from "./collision.js";

const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
const body = (id: string, x: number, y: number, radius = 24): CollisionBody => ({ id, x, y, radius });
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= COLLISION_TOLERANCE, `${actual} != ${expected}`);

for (const team of ["red", "blue"]) {
  test(`collision matrix ignores teams (${team}), self and inactive entities`, () => {
    const world = new GameState();
    const tank = Object.assign(new Tank(), { id: "self", team });
    const minion = Object.assign(new Minion(), { id: "mob", team });
    world.tanks.set(tank.id, tank);
    world.tanks.set("alive", Object.assign(new Tank(), { id: "alive", team: "blue" }));
    world.tanks.set("preview", Object.assign(new Tank(), { id: "preview", team, state: "dead" }));
    world.minions.set(minion.id, minion);
    world.minions.set("other-mob", Object.assign(new Minion(), { id: "other-mob", team: "red" }));
    world.minions.set("dead-mob", Object.assign(new Minion(), { id: "dead-mob", hp: 0 }));
    world.towers.set("tower", Object.assign(new Tower(), { id: "tower", team }));
    world.towers.set("ruin", Object.assign(new Tower(), { id: "ruin", hp: 0 }));
    world.bases.set("base", Object.assign(new Base(), { id: "base", team }));
    world.bases.set("destroyed-base", Object.assign(new Base(), { id: "destroyed-base", hp: 0 }));
    assert.deepEqual(movementBlockers(tank, world).map(other => other.id), ["alive", "base", "tower"]);
    assert.deepEqual(movementBlockers(minion, world).map(other => other.id), ["base", "other-mob", "tower"]);
  });
}

test("sweep stops a large step before a blocker even if its endpoint is beyond it", () => {
  const blocker = body("obstacle", 400, 300);
  const next = resolveMovement({ x: 100, y: 300 }, { x: 700, y: 0 }, 24, [blocker], bounds);
  close(next.x, 352);
  close(next.y, 300);
  close(next.pathDistance, 252);
  assert.ok(Math.hypot(next.x - blocker.x, next.y - blocker.y) >= 48 - COLLISION_TOLERANCE);
});

test("zero movement, exact tangent and contact moving away remain unblocked", () => {
  const blocker = body("obstacle", 400, 300);
  assert.deepEqual(resolveMovement({ x: 100, y: 300 }, { x: 0, y: 0 }, 24, [blocker], bounds), { x: 100, y: 300, pathDistance: 0 });
  close(resolveMovement({ x: 352, y: 300 }, { x: -50, y: 0 }, 24, [blocker], bounds).x, 302);
  close(resolveMovement({ x: 100, y: 348 }, { x: 700, y: 0 }, 24, [blocker], bounds).x, 800);
  close(resolveMovement({ x: 352, y: 300 }, { x: 50, y: 0 }, 24, [blocker], bounds).x, 352);
});

test("sliding stays separate from multiple blockers and consumes no extra movement", () => {
  const blockers = [body("a", 400, 300), body("b", 460, 350)];
  for (let offset = 1; offset < 48; offset += 2) {
    const next = resolveMovement({ x: 100, y: 300 + offset }, { x: 600, y: 20 }, 24, blockers, bounds);
    assert.ok(next.pathDistance <= Math.hypot(600, 20) + COLLISION_TOLERANCE);
    assert.ok(isClearPosition(next, 24, blockers, bounds));
  }
});

test("radius-aware world edges and corners constrain both the body and sliding", () => {
  const blockers = [body("near-edge", 930, 930)];
  const next = resolveMovement({ x: 900, y: 800 }, { x: 300, y: 300 }, 24, blockers, bounds);
  assert.ok(isClearPosition(next, 24, blockers, bounds));
  assert.ok(next.pathDistance <= Math.hypot(300, 300));
  const corner = resolveMovement({ x: 900, y: 900 }, { x: 300, y: 400 }, 24, [], bounds);
  close(corner.x, 976);
  close(corner.y, 976);
});

test("near-base search preserves clear preferred positions and falls back deterministically when random attempts repeat", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const base = body("base", 500, 500, 48);
  const preferred = { x: 610, y: 500 };
  assert.deepEqual(findClearNearBase(base, 24, [base], bounds, preferred), preferred);
  const blockers = [base, body("occupant", 390, 500), body("occupied-preview", 610, 500)];
  const position = findClearNearBase(base, 24, blockers, bounds, preferred)!;
  assert.ok(position);
  assert.ok(isClearPosition(position, 24, blockers, bounds));
  const distance = Math.hypot(position.x - base.x, position.y - base.y);
  assert.ok(distance >= 80 && distance <= 140 + COLLISION_TOLERANCE);
  assert.equal(findClearNearBase(base, 24, [body("full", 500, 500, 200)], bounds), undefined);
});

test("lane spawn candidates clear the base and previous wave members without crossing world edges", () => {
  const base = body("base", 100, 500, 48);
  const blockers = [base];
  for (const waypoint of [{ x: 400, y: 200 }, { x: 900, y: 500 }, { x: 400, y: 800 }]) {
    const point = findLaneSpawn(base, waypoint, 11, blockers, bounds)!;
    assert.ok(point);
    assert.ok(isClearPosition(point, 11, blockers, bounds));
    blockers.push(body(`minion-${blockers.length}`, point.x, point.y, 11));
  }
  assert.equal(findLaneSpawn(base, { x: 900, y: 500 }, 11, [body("full", 100, 500, 300)], bounds), undefined);
});
