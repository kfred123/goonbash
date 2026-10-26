import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Server } from "colyseus";
import { Client, type Room } from "colyseus.js";
import { BLUE_BASE_POSITION, GameState, Minion, Tower } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { COLLISION_TOLERANCE } from "./collision.js";

async function until(predicate: () => boolean, label: string) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `Timeout: ${label}`);
    await setTimeout(10);
  }
}

test("two live clients receive collision-constrained commands, minion detours and safe respawns", async (t) => {
  let simulation: GameRoom | undefined;
  class CollisionFixtureRoom extends GameRoom {
    onCreate(options: { lobbyId: string }) {
      super.onCreate(options);
      this.setSimulationInterval();
      this["spawnTimer"] = Infinity;
      this.state.bases.forEach(base => { base.fireRange = 0; });
      simulation = this;
    }
  }
  const lobby = lobbyRegistry.create("Collision socket acceptance");
  const http = createServer();
  const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
  server.define("collision_fixture", CollisionFixtureRoom);
  const connections: Array<Room<GameState>> = [];
  t.after(async () => {
    await Promise.all(connections.map(room => room.leave()));
    await server.gracefullyShutdown(false);
  });
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const client = new Client(`ws://127.0.0.1:${address.port}`);
  const first = await client.create<GameState>("collision_fixture", { lobbyId: lobby.id });
  connections.push(first);
  const second = await client.joinById<GameState>(first.id, { lobbyId: lobby.id });
  connections.push(second);
  await until(() => first.state.tanks.size === 2 && second.state.tanks.size === 2, "roster");
  first.send("change_team", "blue");
  second.send("change_team", "blue");
  await until(() => simulation!.state.tanks.get(first.sessionId)!.team === "blue"
    && simulation!.state.tanks.get(second.sessionId)!.team === "blue", "team commands");
  first.send("set_ready", true);
  second.send("set_ready", true);
  await until(() => [...simulation!.state.tanks.values()].every(tank => tank.ready), "readiness");
  first.send("start_game");
  await until(() => simulation!.state.phase === "countdown", "countdown admitted");
  simulation!.clock.elapsedTime += 5000;
  for (const timer of [...simulation!.clock.delayed]) if (timer.active) timer.tick(5000);
  await until(() => first.state.phase === "started" && second.state.phase === "started", "started match");
  const room = simulation!;
  const mover = room.state.tanks.get(first.sessionId)!;
  const peer = room.state.tanks.get(second.sessionId)!;
  mover.sightRange = peer.sightRange = 1000;
  mover.fireRange = peer.fireRange = 0;
  room.state.towers.clear();

  async function commandPastBlocker(expectedX: number) {
    mover.hasMoveTarget = false;
    first.send("command", { x: 1100, y: 900 });
    await until(() => mover.hasMoveTarget, "movement command admitted");
    room["updateTankMovement"](10);
    await until(() => [first, second].every(connection => {
      const replicated = connection.state.tanks.get(mover.id);
      return !!replicated && Math.abs(replicated.x - expectedX) < COLLISION_TOLERANCE;
    }), "both clients receive constrained position");
    assert.equal(mover.hasMoveTarget, true);
  }

  for (const team of ["blue", "red"]) {
    Object.assign(mover, { x: 800, y: 900 });
    Object.assign(peer, { x: 900, y: 900, team });
    await commandPastBlocker(852);
  }
  peer.x = 1300;
  const tower = Object.assign(new Tower(), { id: "fixture-tower", team: "blue", x: 900, y: 900 });
  room.state.towers.set(tower.id, tower);
  Object.assign(mover, { x: 800, y: 900 });
  await commandPastBlocker(852);
  tower.hp = 0;
  room["updateTankMovement"](10);
  await until(() => first.state.tanks.get(mover.id)!.x === 1100, "ruin becomes passable");

  const base = room.state.bases.get("blue-base")!;
  Object.assign(mover, { x: base.x + 150, y: base.y, hasMoveTarget: false });
  first.send("command", { x: base.x - 100, y: base.y });
  await until(() => mover.hasMoveTarget, "base crossing command");
  room["updateTankMovement"](10);
  assert.ok(Math.abs(mover.x - base.x - base.radius - mover.radius) < COLLISION_TOLERANCE);
  await until(() => Math.abs(first.state.tanks.get(mover.id)!.x - mover.x) < COLLISION_TOLERANCE, "base contact replicated");

  const mob = Object.assign(new Minion(), { id: "fixture-mob", team: "blue", x: 900, y: 900, waypointX: 1200, waypointY: 900 });
  room.state.minions.set(mob.id, mob);
  Object.assign(mover, { x: 800, y: 900, hasMoveTarget: false });
  first.send("command", { x: 1000, y: 900 });
  await until(() => mover.hasMoveTarget, "pass-through command");
  room["updateTankMovement"](10);
  assert.equal(mover.x, 1000);
  tower.hp = tower.maxHp;
  tower.x = 1000;
  for (let tick = 0; tick < 600; tick++) {
    room["updateMinionMovement"](1 / 60);
    assert.ok(Math.hypot(mob.x - tower.x, mob.y - tower.y) >= mob.radius + tower.radius - COLLISION_TOLERANCE);
  }
  assert.ok(mob.x > tower.x + tower.radius + mob.radius);
  await until(() => first.state.minions.get(mob.id)?.x === mob.x, "minion detour replicated");

  room["applyDamage"](mover, 100000);
  const preview = { x: mover.x, y: mover.y };
  Object.assign(peer, { x: preview.x, y: preview.y, team: "blue" });
  room["resolveRespawns"](mover.respawnAt);
  assert.equal(mover.state, "alive");
  assert.ok(Math.hypot(mover.x - peer.x, mover.y - peer.y) >= mover.radius + peer.radius);
  assert.ok(Math.hypot(mover.x - BLUE_BASE_POSITION.x, mover.y - BLUE_BASE_POSITION.y) <= 140 + COLLISION_TOLERANCE);
  await until(() => first.state.tanks.get(mover.id)!.state === "alive"
    && first.state.tanks.get(mover.id)!.x === mover.x
    && second.state.tanks.get(mover.id)!.x === mover.x, "safe respawn replicated to both clients");
});
