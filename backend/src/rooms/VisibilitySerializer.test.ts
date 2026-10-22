import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { ClientState, Protocol } from "colyseus";
import type { Client } from "colyseus";
import { Base, computeAbilityConfigForLevel, GameState, MatchPlayerStats, Minion, Projectile, Tank, Tower } from "shared";
import { VisibilitySerializer } from "./VisibilitySerializer.js";
import { activateAbility } from "./ability.js";

function connection(id: string) {
  const decoded = new GameState();
  const packets: number[][] = [];
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  const client: Client = {
    id, sessionId: id, state: ClientState.JOINED, readyState: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    raw(data) {
      const bytes = Array.from(data);
      assert.equal(bytes[0], Protocol.ROOM_STATE_PATCH);
      packets.push(bytes);
      decoded.decode(bytes.slice(1));
    },
    send: unexpected, sendBytes: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  return { client, decoded, packets };
}

function setup() {
  const source = new GameState();
  source.phase = "started";
  // All positions lie in grass: default tank vision is 325 / 4 = 81.25.
  const blue = Object.assign(new Tank(), { id: "blue", team: "blue", x: 1000, y: 600 });
  const red = Object.assign(new Tank(), { id: "red", team: "red", x: 1100, y: 600 });
  source.tanks.set(blue.id, blue);
  source.tanks.set(red.id, red);
  source.minions.set("concealed-initial-minion", Object.assign(new Minion(), { id: "concealed-initial-minion", team: "red", x: 1800, y: 600 }));
  source.towers.set("concealed-initial-tower", Object.assign(new Tower(), { id: "concealed-initial-tower", team: "red", x: 1800, y: 600 }));
  source.bases.set("concealed-initial-base", Object.assign(new Base(), { id: "concealed-initial-base", team: "red", x: 1800, y: 600 }));
  source.projectiles.set("concealed-initial-shot", Object.assign(new Projectile(), { id: "concealed-initial-shot", team: "red", x: 1800, y: 600 }));
  source.playerStats.set(red.id, Object.assign(new MatchPlayerStats(), { name: "Public red", team: "red" }));
  const serializer = new VisibilitySerializer();
  serializer.reset(source);
  const first = connection(blue.id);
  const second = connection(red.id);
  const connections = [first, second];
  const join = (value: ReturnType<typeof connection>) => {
    const bytes = serializer.getFullState(value.client);
    value.decoded.decode(bytes);
    return bytes;
  };
  const patch = () => serializer.applyPatches(connections.map(value => value.client));
  const initialBlue = join(first);
  const initialRed = join(second);
  patch();
  first.packets.length = second.packets.length = 0;
  return { source, blue, red, serializer, first, second, connections, patch, join, initialBlue, initialRed };
}

test("initial snapshots exclude concealed spatial entities for both teams and keep public scores", () => {
  const { first, second, initialBlue, initialRed } = setup();
  assert.deepEqual([...first.decoded.tanks.keys()], ["blue"]);
  assert.deepEqual([...second.decoded.tanks.keys()], ["red"]);
  assert.equal(first.decoded.playerStats.get("red")!.name, "Public red");
  for (const [collection, id] of [
    [first.decoded.minions, "concealed-initial-minion"],
    [first.decoded.towers, "concealed-initial-tower"],
    [first.decoded.bases, "concealed-initial-base"],
    [first.decoded.projectiles, "concealed-initial-shot"]
  ] as const) {
    assert.equal(collection.has(id), false);
    assert.equal(Buffer.from(initialBlue).includes(Buffer.from(id)), false);
  }
  assert.notDeepEqual(initialBlue, initialRed);
});

test("stationary towers, bases, ruins and units are added and removed when only a scout moves", () => {
  const { source, first, patch } = setup();
  const scout = Object.assign(new Minion(), { id: "scout", team: "blue", x: 1000, y: 600 });
  source.minions.set(scout.id, scout);
  source.towers.set("hidden-tower", Object.assign(new Tower(), { id: "hidden-tower", team: "red", x: 1300, y: 600, shotCount: 9 }));
  source.bases.set("hidden-base", Object.assign(new Base(), { id: "hidden-base", team: "red", x: 1300, y: 600 }));
  source.minions.set("hidden-minion", Object.assign(new Minion(), { id: "hidden-minion", team: "red", x: 1300, y: 600 }));
  patch();
  assert.equal(first.decoded.towers.size, 0);
  for (let iteration = 0; iteration < 3; iteration++) {
    scout.x = 1300;
    patch();
    assert.equal(first.decoded.towers.get("hidden-tower")!.shotCount, 9 + iteration);
    assert.equal(first.decoded.bases.size, 1);
    assert.equal(first.decoded.minions.has("hidden-minion"), true);
    scout.x = 1000;
    patch();
    assert.equal(first.decoded.towers.size, 0);
    assert.equal(first.decoded.bases.size, 0);
    assert.equal(first.decoded.minions.has("hidden-minion"), false);
    source.towers.get("hidden-tower")!.shotCount++;
  }
  source.towers.get("hidden-tower")!.hp = 0;
  scout.x = 1300;
  patch();
  assert.equal(first.decoded.towers.get("hidden-tower")!.hp, 0);
  scout.hp = 0;
  patch();
  assert.equal(first.decoded.towers.size, 0);
  assert.equal(first.decoded.minions.has("scout"), true);
});

test("hidden changes produce no enemy bytes or patches and do not mutate canonical state", () => {
  const { blue, red, source, first, patch } = setup();
  red.x = 1300.125;
  red.hp = 37;
  red.xp = 987;
  red.abilities.get("tank-entrench")!.activeUntil = 987654321;
  const secret = "concealed-projectile-unique-id";
  source.projectiles.set(secret, Object.assign(new Projectile(), { id: secret, team: "red", x: red.x, y: red.y }));
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  assert.equal(first.decoded.projectiles.size, 0);
  assert.equal(first.packets.length, 0);
  assert.equal(red.hp, 37);
  assert.equal(red.xp, 987);
  assert.equal(red.abilities.get("tank-entrench")!.activeUntil, 987654321);
  assert.equal(blue.x, 1000);
  assert.equal(source.projectiles.has(secret), true);
});

test("concealment emits deletion without copying the final hidden position or health", () => {
  const { red, first, second, patch } = setup();
  red.x = 1020;
  patch();
  assert.equal(first.decoded.tanks.get("red")!.x, 1020);
  first.packets.length = 0;
  red.x = 1300.125;
  red.hp = 37;
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  assert.equal(first.packets.length, 1);
  assert.equal(second.decoded.tanks.get("red")!.hp, 37);
  const hiddenFloat = Buffer.alloc(8);
  hiddenFloat.writeDoubleLE(red.x);
  assert.equal(Buffer.from(first.packets[0]).includes(hiddenFloat), false);
});

test("hidden references are removed even from allied shots and stale target locks", () => {
  const { source, blue, red, first, patch } = setup();
  blue.targetId = blue.lockedTargetId = red.id;
  source.towers.set("ally", Object.assign(new Tower(), { id: "ally", team: "blue", x: blue.x, y: blue.y, sightRange: 0, targetId: red.id }));
  source.projectiles.set("shot", Object.assign(new Projectile(), { id: "shot", team: "blue", targetId: red.id, ownerId: red.id, x: 1300, y: 600 }));
  patch();
  assert.equal(first.decoded.tanks.get("blue")!.targetId, "");
  assert.equal(first.decoded.tanks.get("blue")!.lockedTargetId, "");
  assert.equal(first.decoded.towers.get("ally")!.targetId, "");
  assert.equal(first.decoded.projectiles.get("shot")!.targetId, "");
  assert.equal(first.decoded.projectiles.get("shot")!.ownerId, "");
  assert.equal(source.projectiles.get("shot")!.targetId, red.id);
  red.x = 1020;
  patch();
  assert.equal(first.decoded.projectiles.get("shot")!.targetId, red.id);
  assert.equal(first.decoded.tanks.get("blue")!.lockedTargetId, red.id);
  red.x = 1300;
  patch();
  assert.equal(first.decoded.projectiles.get("shot")!.targetId, "");
});

test("enemy and allied movement goals, waypoints and private ability data stay private", () => {
  const { source, blue, red, first, second, patch } = setup();
  red.x = 1020;
  const ally = Object.assign(new Tank(), { id: "ally", team: "blue", x: 1000, y: 600 });
  source.tanks.set(ally.id, ally);
  for (const tank of [blue, red, ally]) {
    tank.hasMoveTarget = true;
    tank.moveTargetX = 2345.5;
    tank.moveTargetY = 1678.5;
    tank.xp = 987;
    tank.skillPoints = 3;
    const ability = tank.abilities.get("tank-entrench")!;
    ability.level = 2;
    ability.activeUntil = 5678;
    ability.cooldownEndsAt = 123456789;
  }
  source.minions.set("minion", Object.assign(new Minion(), { id: "minion", team: "red", x: 1020, y: 600, waypointX: 2100, waypointY: 700 }));
  patch();
  for (const id of ["red", "ally"]) {
    const projected = first.decoded.tanks.get(id)!;
    assert.equal(projected.hasMoveTarget, false);
    assert.equal(projected.moveTargetX, 0);
    assert.equal(projected.moveTargetY, 0);
    assert.equal(projected.xp, 0);
    assert.equal(projected.skillPoints, 0);
    assert.equal(projected.abilities.get("tank-entrench")!.cooldownEndsAt, 0);
    assert.equal(projected.abilities.get("tank-entrench")!.activeUntil, 0);
  }
  assert.equal(first.decoded.tanks.get("blue")!.moveTargetX, blue.moveTargetX);
  assert.equal(second.decoded.tanks.get("red")!.moveTargetY, red.moveTargetY);
  assert.equal(second.decoded.tanks.get("red")!.abilities.get("tank-entrench")!.cooldownEndsAt, 123456789);
  assert.equal(first.decoded.tanks.get("blue")!.abilities.get("tank-entrench")!.activeUntil, 5678);
  assert.equal(second.decoded.tanks.get("red")!.abilities.get("tank-entrench")!.activeUntil, 5678);
  assert.equal(first.decoded.minions.get("minion")!.waypointX, 0);
});

test("a concealed rocket cast is private on revelation, while only unexpired effects reach other clients", (t) => {
  let now = 1000000;
  t.mock.method(Date, "now", () => now);
  const { red, first, second, patch, join } = setup();
  const rocketId = "damagedealer-homing-rocket";
  const rocket = red.abilities.get(rocketId)!;
  Object.assign(rocket, activateAbility(now, computeAbilityConfigForLevel(rocketId, 1)));
  assert.equal(rocket.activeUntil, now);
  patch();
  assert.equal(first.decoded.tanks.has(red.id), false);
  assert.equal(second.decoded.tanks.get(red.id)!.abilities.get(rocketId)!.activeUntil, now);

  now += 100;
  red.x = 1020;
  const effect = red.abilities.get("tank-entrench")!;
  Object.assign(effect, activateAbility(now, computeAbilityConfigForLevel("tank-entrench", 1)));
  assert.ok(effect.activeUntil > now);
  patch();
  const revealed = first.decoded.tanks.get(red.id)!;
  assert.equal(revealed.abilities.get(rocketId)!.activeUntil, 0);
  assert.equal(revealed.abilities.get(rocketId)!.cooldownEndsAt, 0);
  assert.equal(revealed.abilities.get("tank-entrench")!.activeUntil, effect.activeUntil);

  const late = connection("blue");
  join(late);
  assert.equal(late.decoded.tanks.get(red.id)!.abilities.get(rocketId)!.activeUntil, 0);
  assert.equal(late.decoded.tanks.get(red.id)!.abilities.get("tank-entrench")!.activeUntil, effect.activeUntil);

  now = effect.activeUntil;
  patch();
  assert.equal(revealed.abilities.get("tank-entrench")!.activeUntil, 0);
  assert.equal(second.decoded.tanks.get(red.id)!.abilities.get("tank-entrench")!.activeUntil, now);
  assert.equal(rocket.activeUntil, 1000000);
  assert.equal(second.decoded.tanks.get(red.id)!.abilities.get(rocketId)!.activeUntil, rocket.activeUntil);
});

test("hostile projectiles follow their own sight boundary, regardless of owner visibility", () => {
  const { source, first, patch } = setup();
  const projectile = Object.assign(new Projectile(), { id: "hostile-shot", team: "red", ownerId: "red", targetId: "blue", x: 1000, y: 600 });
  source.projectiles.set(projectile.id, projectile);
  patch();
  assert.equal(first.decoded.projectiles.get(projectile.id)!.ownerId, "");
  assert.equal(first.decoded.projectiles.get(projectile.id)!.targetId, "blue");
  projectile.x = 1200;
  patch();
  assert.equal(first.decoded.projectiles.size, 0);
  projectile.x = 1000;
  patch();
  assert.equal(first.decoded.projectiles.size, 1);
});

test("own dead tank remains available; scouts reveal, cease revealing on death and resume on respawn", () => {
  const { blue, red, source, first, patch } = setup();
  blue.state = "dead";
  blue.hp = 0;
  blue.respawnAt = 12345;
  patch();
  assert.equal(first.decoded.tanks.get("blue")!.respawnAt, 12345);
  red.x = 1020;
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  blue.state = "alive";
  blue.hp = 100;
  patch();
  assert.equal(first.decoded.tanks.has("red"), true);
  red.state = "dead";
  red.hp = 0;
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  assert.equal(source.tanks.has("red"), true);
  red.state = "alive";
  red.hp = 100;
  patch();
  assert.equal(first.decoded.tanks.has("red"), true);
});

test("team changes and unknown or removed memberships fail closed in snapshots and patches", () => {
  const { blue, source, first, connections, serializer, patch, join } = setup();
  blue.team = "red";
  patch();
  assert.equal(first.decoded.tanks.has("red"), true);
  source.tanks.delete("blue");
  patch();
  assert.equal(first.decoded.tanks.size, 0);
  const unknown = connection("unknown");
  connections.push(unknown);
  join(unknown);
  assert.equal(unknown.decoded.tanks.size, 0);
  assert.equal(unknown.decoded.bases.size, 0);
  assert.equal(unknown.decoded.projectiles.size, 0);
  blue.team = "neutral";
  source.tanks.set("blue", blue);
  patch();
  assert.equal(first.decoded.tanks.size, 0);
  assert.throws(() => serializer.getFullState(), /receiving client/);
});

test("lobby roster, role and team changes are public but canonical spawn and structures are not", () => {
  const { source, red, first, patch } = setup();
  source.phase = "waiting";
  source.bases.set("base-red", Object.assign(new Base(), { id: "base-red", team: "red", x: 2160, y: 900 }));
  patch();
  assert.equal(first.decoded.tanks.size, 2);
  assert.equal(first.decoded.tanks.get("red")!.x, 0);
  assert.equal(first.decoded.bases.size, 0);
  red.role = "healer";
  red.team = "blue";
  patch();
  assert.equal(first.decoded.tanks.get("red")!.role, "healer");
  assert.equal(first.decoded.tanks.get("red")!.team, "blue");
  red.team = "red";
  source.phase = "started";
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  source.phase = "ended";
  source.winnerTeam = "red";
  patch();
  assert.equal(first.decoded.tanks.has("red"), false);
  assert.equal(first.decoded.winnerTeam, "red");
  assert.equal(first.decoded.playerStats.size, 1);
});

test("late join/full snapshots do not consume another client's pending updates; rejoin has no stale view", () => {
  const { source, blue, red, first, second, connections, serializer, patch, join } = setup();
  blue.hp = 67;
  const late = connection("blue");
  connections.push(late);
  join(late);
  patch();
  assert.equal(first.decoded.tanks.get("blue")!.hp, 67);
  assert.equal(late.decoded.tanks.get("blue")!.hp, 67);
  red.x = 1020;
  patch();
  assert.equal(late.decoded.tanks.has("red"), true);
  connections.splice(connections.indexOf(late), 1);
  serializer.removeClient(late.client);
  assert.equal(serializer["views"].has(late.client), false);
  red.x = 1500;
  patch();
  const rejoined = connection("blue");
  connections.push(rejoined);
  join(rejoined);
  assert.equal(rejoined.decoded.tanks.has("red"), false);
  assert.equal(source.tanks.size, 2);
  assert.equal(second.decoded.tanks.has("red"), true);
  connections.splice(connections.indexOf(rejoined), 1);
  patch();
  assert.equal(serializer["views"].has(rejoined.client), false);
  serializer.dispose();
  assert.equal(serializer["views"].size, 0);
});

test("ten-client normal and minion-heavy projection profiling", (t) => {
  for (const count of [0, 200]) {
    const source = new GameState();
    source.phase = "started";
    const serializer = new VisibilitySerializer();
    serializer.reset(source);
    const clients = Array.from({ length: 10 }, (_, index) => {
      const tank = Object.assign(new Tank(), { id: `player-${index}`, team: index % 2 ? "red" : "blue", x: 900 + index * 20, y: 900 });
      source.tanks.set(tank.id, tank);
      return connection(tank.id);
    });
    for (let index = 0; index < count; index++) {
      source.minions.set(`minion-${index}`, Object.assign(new Minion(), {
        id: `minion-${index}`, team: index % 2 ? "red" : "blue", x: 240 + index % 30 * 60, y: 850 + Math.floor(index / 30) * 12
      }));
    }
    for (const value of clients) value.decoded.decode(serializer.getFullState(value.client));
    const times: number[] = [];
    for (let frame = 0; frame < 25; frame++) {
      source.minions.forEach(minion => minion.x += 1);
      source.tanks.forEach(tank => tank.x += 1);
      const start = performance.now();
      serializer.applyPatches(clients.map(value => value.client));
      times.push(performance.now() - start);
    }
    const mean = times.reduce((a, b) => a + b) / times.length;
    t.diagnostic(`${count} minions / 10 clients: projection + encoding + test decoding mean ${mean.toFixed(2)}ms, max ${Math.max(...times).toFixed(2)}ms`);
    assert.equal(clients[0].decoded.tanks.get("player-0")!.x, 925);
    serializer.dispose();
  }
});
