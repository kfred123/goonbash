import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, type TestContext } from "node:test";
import type { Client } from "colyseus";
import { Base, BLUE_BASE_POSITION, GameState, Minion, RED_BASE_POSITION, Tank, Tower } from "shared";
import { GameRoom } from "./GameRoom.js";
import { COLLISION_TOLERANCE, isClearPosition, movementBlockers, type CollisionBody } from "./collision.js";
import { moveMinion, type MinionDetour } from "./minionMovement.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { updateClientView } from "./VisibilitySerializer.js";

const bounds = { minX: 60, maxX: 2340, minY: 60, maxY: 1740 };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < COLLISION_TOLERANCE, `${actual} != ${expected}`);

function setup(t: TestContext) {
  const room = new class extends GameRoom {
    get metadata() { return { lobbyId: lobby.id }; }
  }();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Collision tests");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room["spawnTimer"] = Infinity;
  room.state.phase = "started";
  room.state.bases.forEach(base => { base.fireRange = 0; });
  t.after(() => {
    room.onDispose();
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, lobby };
}

function tank(room: GameRoom, id: string, x: number, y: number, team = "blue") {
  const unit = Object.assign(new Tank(), { id, x, y, team, fireRange: 0, moveSpeed: 100 });
  room.state.tanks.set(id, unit);
  return unit;
}

function assertSeparated(room: GameRoom) {
  for (const unit of [...room.state.tanks.values()].filter(other => other.state === "alive")) {
    for (const blocker of movementBlockers(unit, room.state)) {
      assert.ok(Math.hypot(unit.x - blocker.x, unit.y - blocker.y) >= unit.radius + blocker.radius - COLLISION_TOLERANCE,
        `${unit.id} overlaps ${blocker.id}`);
    }
  }
  for (const unit of room.state.minions.values()) {
    assert.ok(unit.x >= bounds.minX + unit.radius && unit.x <= bounds.maxX - unit.radius);
    assert.ok(unit.y >= bounds.minY + unit.radius && unit.y <= bounds.maxY - unit.radius);
    for (const blocker of movementBlockers(unit, room.state)) {
      assert.ok(Math.hypot(unit.x - blocker.x, unit.y - blocker.y) >= unit.radius + blocker.radius - COLLISION_TOLERANCE,
        `${unit.id} overlaps ${blocker.id}`);
    }
  }
}

for (const team of ["red", "blue"]) {
  test(`player movement blocks ${team} players without pushing and resumes after clearance`, (t) => {
    const { room } = setup(t);
    const moving = tank(room, "a", 800, 900);
    const stationary = tank(room, "b", 900, 900, team);
    Object.assign(moving, { hasMoveTarget: true, moveTargetX: 1100, moveTargetY: 900 });
    room["updateTankMovement"](10);
    close(moving.x, 852);
    assert.equal(moving.hasMoveTarget, true);
    assert.equal(stationary.x, 900);
    stationary.y += 100;
    room["updateTankMovement"](10);
    close(moving.x, 1100);
    assert.equal(moving.hasMoveTarget, false);
  });
}

test("simultaneous player movement is collision-safe and independent of collection insertion order", (t) => {
  const { room } = setup(t);
  function run(reverse: boolean) {
    room.state.tanks.clear();
    const a = Object.assign(new Tank(), { id: "a", x: 800, y: 900, hasMoveTarget: true, moveTargetX: 1000, moveTargetY: 900 });
    const b = Object.assign(new Tank(), { id: "b", x: 1000, y: 900, hasMoveTarget: true, moveTargetX: 800, moveTargetY: 900 });
    for (const unit of reverse ? [b, a] : [a, b]) room.state.tanks.set(unit.id, unit);
    room["updateTankMovement"](10);
    assert.ok(a.x < b.x);
    assertSeparated(room);
    return [a.x, a.y, b.x, b.y];
  }
  assert.deepEqual(run(false), run(true));
});

test("pursuit preserves valid locks while blocked and stops in range without altering passive fire", (t) => {
  const { room } = setup(t);
  const moving = tank(room, "a", 800, 900);
  moving.sightRange = 1000;
  const blocker = tank(room, "b", 900, 900);
  const target = tank(room, "target", 1100, 900, "red");
  moving.lockedTargetId = target.id;
  room["updateTankMovement"](10);
  close(moving.x, 852);
  assert.equal(moving.lockedTargetId, target.id);
  blocker.y = 1100;
  moving.fireRange = 250;
  room["updateTankMovement"](1);
  close(moving.x, 852);
  room["resolveCombat"](0);
  assert.equal(moving.targetId, target.id);
  assert.ok(room.state.projectiles.size > 0);
  moving.lockedTargetId = "";
  moving.hasMoveTarget = true;
  moving.moveTargetX = 700;
  moving.moveTargetY = 900;
  room["resolveCombat"](0);
  assert.equal(moving.hasMoveTarget, true);
  assert.equal(moving.targetId, target.id);
});

for (const Entity of [Tower, Base]) {
  for (const team of ["red", "blue"]) {
    test(`players block on living ${Entity.name} (${team}) and pass destroyed structures`, (t) => {
      const { room } = setup(t);
      const unit = tank(room, "a", 800, 900);
      Object.assign(unit, { hasMoveTarget: true, moveTargetX: 1100, moveTargetY: 900 });
      const obstacle = Object.assign(new Entity(), { id: "obstacle", team, x: 900, y: 900 });
      if (obstacle instanceof Tower) room.state.towers.set(obstacle.id, obstacle);
      else room.state.bases.set(obstacle.id, obstacle);
      room["updateTankMovement"](10);
      close(unit.x, 900 - unit.radius - obstacle.radius);
      assert.equal(unit.hasMoveTarget, true);
      obstacle.hp = 0;
      room["updateTankMovement"](10);
      close(unit.x, 1100);
    });
  }
}

test("dead previews and minions are passable; living players ignore minion occupancy", (t) => {
  const { room } = setup(t);
  const unit = tank(room, "a", 800, 900);
  Object.assign(unit, { hasMoveTarget: true, moveTargetX: 1000, moveTargetY: 900 });
  Object.assign(tank(room, "preview", 850, 900), { state: "dead", hp: 0, respawnAt: Infinity });
  const minion = Object.assign(new Minion(), { id: "mob", x: 900, y: 900, waypointX: 1000, waypointY: 900 });
  room.state.minions.set(minion.id, minion);
  room["updateTankMovement"](10);
  close(unit.x, 1000);
  room["updateMinionMovement"](10);
  close(minion.x, 1000);
  close(minion.y, 900);
});

test("Entrench is immobile and speed modifiers, grass and zero delta do not gain collision distance", (t) => {
  const { room } = setup(t);
  const healer = tank(room, "a", 800, 900);
  Object.assign(healer, { role: "healer", hasMoveTarget: true, moveTargetX: 1200, moveTargetY: 900 });
  const speed = healer.abilities.get("healer-speed")!;
  Object.assign(speed, { level: 1, activeUntil: Date.now() + 60000 });
  const entrenched = tank(room, "b", 900, 900);
  Object.assign(entrenched, { hasMoveTarget: true, moveTargetX: 1100, moveTargetY: 900 });
  Object.assign(entrenched.abilities.get("tank-entrench")!, { level: 1, activeUntil: Date.now() + 60000 });
  room["updateTankMovement"](1);
  close(healer.x, 852);
  close(entrenched.x, 900);
  entrenched.state = "dead";
  healer.x = 800;
  room["updateTankMovement"](1);
  close(healer.x, 915);
  healer.x = 1000;
  healer.y = healer.moveTargetY = 600;
  room["updateTankMovement"](1);
  close(healer.x, 1057.5);
  healer.moveTargetX = healer.x + 0.1;
  room["updateTankMovement"](0);
  close(healer.x, 1057.5);
});

test("concealed player still blocks without appearing in the replication view", (t) => {
  const { room } = setup(t);
  const unit = tank(room, "a", 1000, 600);
  unit.sightRange = 0;
  const enemy = tank(room, "hidden", 1100, 600, "red");
  unit.hasMoveTarget = true;
  unit.moveTargetX = 1200;
  unit.moveTargetY = 600;
  room["updateTankMovement"](10);
  close(unit.x, enemy.x - 48);
  const view = new GameState();
  updateClientView(view, room.state, unit.id, room["teamVision"](unit.team));
  assert.equal(view.tanks.has(enemy.id), false);
  assert.equal(view.tanks.get(unit.id)!.hasMoveTarget, true);
});

test("respawn keeps a clear preview, relocates occupied previews and retains progression", (t) => {
  const { room } = setup(t);
  const base = BLUE_BASE_POSITION;
  const unit = tank(room, "owner", base.x + 110, base.y);
  Object.assign(unit, { state: "dead", hp: 0, level: 4, maxHp: 160, xp: 17, skillPoints: 3 });
  room["resolveRespawns"](Date.now());
  close(unit.x, base.x + 110);
  Object.assign(unit, { state: "dead", hp: 0 });
  tank(room, "blocker", unit.x, unit.y);
  room["resolveRespawns"](Date.now());
  assert.equal(unit.state, "alive");
  assert.equal(unit.hp, 160);
  assert.equal(unit.level, 4);
  assert.equal(unit.xp, 17);
  assert.equal(unit.skillPoints, 3);
  assertSeparated(room);
  assert.ok(Math.hypot(unit.x - base.x, unit.y - base.y) <= 140 + COLLISION_TOLERANCE);
});

test("saturated player activation retries once space clears and logs only once", (t) => {
  const { room } = setup(t);
  const warnings: unknown[][] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => warnings.push(args));
  const base = BLUE_BASE_POSITION;
  const unit = tank(room, "pending", base.x + 110, base.y);
  Object.assign(unit, { state: "dead", hp: 0 });
  const wall = Object.assign(new Tower(), { id: "wall", x: base.x, y: base.y, radius: 250 });
  room.state.towers.set(wall.id, wall);
  room["resolveRespawns"](Date.now());
  room["resolveRespawns"](Date.now());
  assert.equal(unit.state, "dead");
  assert.equal(warnings.length, 1);
  room.state.towers.delete(wall.id);
  room["resolveRespawns"](Date.now());
  assert.equal(unit.state, "alive");
  assert.equal(room["deferredTanks"].size, 0);
  assertSeparated(room);
});

function client(id: string): Client {
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  return {
    sessionId: id, id, readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [], send: unexpected, sendBytes: unexpected,
    raw: unexpected, enqueueRaw: unexpected, leave: unexpected, close: unexpected, error: unexpected
  };
}

test("initial joins and match start respect occupied spawns and changed lobby teams", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const { room, lobby } = setup(t);
  room.state.phase = "waiting";
  const first = client("one");
  room.onJoin(first, { lobbyId: lobby.id });
  room.onJoin(client("two"), { lobbyId: lobby.id });
  const owner = room.state.tanks.get(first.sessionId)!;
  owner.team = "blue";
  room["onMessageHandlers"].start_game(first);
  assert.equal(room.state.phase, "started");
  assert.ok(Math.hypot(owner.x - BLUE_BASE_POSITION.x, owner.y - BLUE_BASE_POSITION.y) <= 140 + COLLISION_TOLERANCE);
  assertSeparated(room);
});

test("saturated waves retain lane identities, retry without duplicates and clean up on match end", (t) => {
  const { room } = setup(t);
  const warnings: unknown[][] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => warnings.push(args));
  for (const base of room.state.bases.values()) {
    room.state.towers.set(`${base.id}-wall`, Object.assign(new Tower(), { id: `${base.id}-wall`, x: base.x, y: base.y, radius: 250 }));
  }
  room["spawnWave"]();
  room["spawnWave"]();
  assert.equal(room.state.minions.size, 0);
  assert.equal(room["pendingMinions"].size, 12);
  room["resolvePendingMinions"]();
  assert.equal(warnings.length, 12);
  room.state.towers.clear();
  room["resolvePendingMinions"]();
  assert.equal(room.state.minions.size, 12);
  assert.equal(room["pendingMinions"].size, 0);
  assertSeparated(room);
  for (const team of ["red", "blue"]) {
    const units = [...room.state.minions.values()].filter(unit => unit.team === team);
    assert.equal(units.length, 6);
    assert.equal(new Set(units.map(unit => `${unit.waypointX}:${unit.waypointY}`)).size, 3);
  }
  room["spawnWave"]();
  room.state.phase = "ended";
  const count = room.state.minions.size;
  room.update(10000);
  assert.equal(room["pendingMinions"].size, 0);
  assert.equal(room.state.minions.size, count);
});

test("leaving cancels a deferred player and disposal clears pending and avoidance state", (t) => {
  const { room, lobby } = setup(t);
  const connection = client("leaving");
  room.onJoin(connection, { lobbyId: lobby.id });
  room["deferredTanks"].add(connection.sessionId);
  room.onLeave(connection, true);
  assert.equal(room["deferredTanks"].size, 0);
  room["minionDetours"].set("removed", { obstacleId: "a", side: 1 });
  room.onDispose();
  assert.equal(room["minionDetours"].size, 0);
  assert.equal(room["pendingMinions"].size, 0);
});

for (const obstacle of [
  { id: "tower", x: 1000, y: 900, radius: 24 },
  { id: "minion", x: 1000, y: 900, radius: 11 },
  { id: "base", x: 1000, y: 900, radius: 48 }
]) {
  test(`minion detours around an isolated ${obstacle.id} then reaches its original waypoint`, () => {
    const unit = Object.assign(new Minion(), { id: "moving", x: 800, y: 900, waypointX: 1200, waypointY: 900 });
    const detours = new Map<string, MinionDetour>();
    let priorSide: number | undefined;
    for (let tick = 0; tick < 800; tick++) {
      const next = moveMinion(unit, 1, [obstacle], bounds, detours);
      assert.ok(next.pathDistance <= 1 + COLLISION_TOLERANCE);
      assert.ok(isClearPosition(next, unit.radius, [obstacle], bounds));
      unit.x = next.x;
      unit.y = next.y;
      const side = detours.get(unit.id)?.side;
      if (side !== undefined && priorSide !== undefined) assert.equal(side, priorSide);
      if (side !== undefined) priorSide = side;
    }
    close(unit.x, 1200);
    close(unit.y, 900);
    assert.equal(detours.size, 0);
  });
}

for (const direction of [1, -1]) {
  test(`minions escape a clustered blocker pocket in direction ${direction} instead of oscillating indefinitely`, () => {
    const blockers = [[1000, 900], [1000, 878], [1000, 922], [978, 878], [978, 922]]
      .map(([x, y], index) => ({ id: `stationary-${index}`, x: 1000 + (x - 1000) * direction, y, radius: 11 }));
    const simulate = (obstacles: CollisionBody[]) => {
      const goalX = 1000 + 200 * direction;
      const unit = Object.assign(new Minion(), { id: "moving", x: 1000 - 200 * direction, y: 900, waypointX: goalX, waypointY: 900 });
      const detours = new Map<string, MinionDetour>();
      for (let tick = 0; tick < 12000; tick++) {
        const next = moveMinion(unit, 50 / 60, obstacles, bounds, detours);
        assert.ok(next.pathDistance <= 50 / 60 + COLLISION_TOLERANCE);
        for (const obstacle of obstacles) {
          assert.ok(Math.hypot(next.x - obstacle.x, next.y - obstacle.y) >= 22 - COLLISION_TOLERANCE);
        }
        unit.x = next.x;
        unit.y = next.y;
        if (Math.hypot(unit.x - goalX, unit.y - 900) < COLLISION_TOLERANCE) {
          assert.ok(tick < 1500, `Cluster took ${tick} ticks to clear`);
          return { x: unit.x, y: unit.y };
        }
      }
      assert.fail(`Minion stuck at (${unit.x}, ${unit.y})`);
    };
    assert.deepEqual(simulate(blockers), simulate([...blockers].reverse()));
  });
}

test("removing a cluster cancels its escape route and immediately restores direct movement", () => {
  const unit = Object.assign(new Minion(), { id: "escaping", x: 975, y: 900, waypointX: 1200, waypointY: 900 });
  const detours = new Map<string, MinionDetour>([[unit.id, {
    obstacleId: "removed", side: 1,
    progress: { bestDistance: 225, attemptedDistance: 10 },
    escape: [{ x: 952, y: 900 }, { x: 952, y: 852 }]
  }]]);
  const next = moveMinion(unit, 1, [], bounds, detours);
  close(next.x, 976);
  close(next.y, 900);
  assert.equal(detours.size, 0);
});

test("minions hold in combat, resume their path, avoid overshoot and clear dead-obstacle detours", (t) => {
  const { room } = setup(t);
  const unit = Object.assign(new Minion(), { id: "minion", x: 800, y: 900, waypointX: 801, waypointY: 900, targetId: "enemy" });
  room.state.minions.set(unit.id, unit);
  room["minionPaths"].set(unit.id, [{ x: 1000, y: 900 }, { x: 1100, y: 900 }]);
  room["updateMinionMovement"](10);
  close(unit.x, 800);
  unit.targetId = "";
  room["updateMinionMovement"](10);
  close(unit.x, 801);
  assert.equal(unit.waypointX, 1000);
  assert.equal(room["minionPaths"].get(unit.id)!.length, 1);
  room["minionDetours"].set(unit.id, { obstacleId: "removed", side: 1 });
  room["updateMinionMovement"](0.1);
  assert.equal(room["minionDetours"].size, 0);
  room["minionDetours"].set(unit.id, { obstacleId: "other", side: 1 });
  room["applyDamage"](unit, 1000);
  assert.equal(room["minionDetours"].size, 0);
});

test("opposing minions remain separate while engaged and resume their lane after target removal", (t) => {
  const { room } = setup(t);
  const blue = Object.assign(new Minion(), { id: "blue", team: "blue", x: 950, y: 900, waypointX: 1500, waypointY: 900 });
  const red = Object.assign(new Minion(), { id: "red", team: "red", x: 1050, y: 900, waypointX: 500, waypointY: 900 });
  room.state.minions.set(blue.id, blue);
  room.state.minions.set(red.id, red);
  room["resolveCombat"](0);
  assert.equal(blue.targetId, red.id);
  assert.equal(red.targetId, blue.id);
  room["updateMinionMovement"](10);
  close(blue.x, 950);
  close(red.x, 1050);
  assertSeparated(room);
  room["applyDamage"](red, 1000);
  room["resolveCombat"](0);
  room["updateMinionMovement"](1);
  close(blue.x, 1000);
});

test("a fully blocked local minion waits without overlap, then resumes after clearance", () => {
  const unit = Object.assign(new Minion(), { id: "waiting", x: 300, y: 300, waypointX: 500, waypointY: 300 });
  const blockers: CollisionBody[] = [];
  for (let index = 0; index < 6; index++) {
    const angle = index * Math.PI / 3;
    blockers.push({ id: `wall-${index}`, x: 300 + Math.cos(angle) * 22, y: 300 + Math.sin(angle) * 22, radius: 11 });
  }
  const detours = new Map<string, MinionDetour>();
  for (let tick = 0; tick < 10; tick++) {
    const next = moveMinion(unit, 1, blockers, bounds, detours);
    assert.ok(Math.hypot(next.x - unit.x, next.y - unit.y) < COLLISION_TOLERANCE);
    assert.ok(isClearPosition(next, unit.radius - COLLISION_TOLERANCE, blockers, bounds));
  }
  const next = moveMinion(unit, 1, [], bounds, detours);
  close(next.x, 301);
});

test("multiple waves remain separate with deterministic results for either insertion order", (t) => {
  const { room } = setup(t);
  function simulate(reverse: boolean) {
    room.state.minions.clear();
    room["minionPaths"].clear();
    room["minionDetours"].clear();
    room["nextMinionId"] = 0;
    for (let tick = 0; tick < 2400; tick++) {
      if (tick % 300 === 0 && tick < 1500) room["spawnWave"]();
      if (reverse && tick % 300 === 0) {
        const units = [...room.state.minions.values()].reverse();
        room.state.minions.clear();
        for (const unit of units) room.state.minions.set(unit.id, unit);
      }
      room["updateMinionMovement"](1 / 30);
      assertSeparated(room);
    }
    assert.equal(room["pendingMinions"].size, 0);
    assert.equal(room.state.minions.size, 30);
    return [...room.state.minions.values()].sort((a, b) => a.id.localeCompare(b.id))
      .map(unit => ({ id: unit.id, x: unit.x, y: unit.y, waypointX: unit.waypointX, waypointY: unit.waypointY }));
  }
  assert.deepEqual(simulate(false), simulate(true));
});
