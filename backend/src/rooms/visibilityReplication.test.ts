import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Server } from "colyseus";
import type { Client as ServerClient } from "colyseus";
import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";
import { Base, BLUE_BASE_POSITION, GameState, RED_BASE_POSITION, Tower } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

async function until(predicate: () => boolean, description: string) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `Timeout: ${description}`);
    await setTimeout(10);
  }
}

// A stopped simulation and fixture-only observer controls make real socket transitions deterministic.
class VisibilityFixtureRoom extends GameRoom {
  onCreate(options: { lobbyId: string }) {
    super.onCreate(options);
    this.setSimulationInterval();
    this.state.bases.clear();
    this.state.bases.set("fixture-base", Object.assign(new Base(), { id: "fixture-base", team: "red", x: 1300, y: 600 }));
    this.state.towers.set("fixture-tower", Object.assign(new Tower(), { id: "fixture-tower", team: "red", x: 1300, y: 600 }));
    this.onMessage("fixture", (client, action: string) => {
      const observer = this.state.tanks.get(client.sessionId);
      if (observer?.team !== "blue") throw new Error("Fixture control requires the blue connection");
      if (action === "begin") this.state.phase = "started";
      else if (action === "reveal") observer.x = 1300;
      else if (action === "conceal") observer.x = 1000;
      else if (action === "hidden-update") {
        this.state.towers.get("fixture-tower")!.shotCount += 9;
        this.state.bases.get("fixture-base")!.hp--;
      } else throw new Error(`Unknown fixture action: ${action}`);
    });
  }

  onJoin(client: ServerClient, options: { lobbyId: string }) {
    this["createBase"]("blue", BLUE_BASE_POSITION.x, BLUE_BASE_POSITION.y);
    this["createBase"]("red", RED_BASE_POSITION.x, RED_BASE_POSITION.y);
    super.onJoin(client, options);
    this.state.bases.delete("blue-base");
    this.state.bases.delete("red-base");
    const tank = this.state.tanks.get(client.sessionId)!;
    const team = this.clients.length === 1 ? "blue" : "red";
    tank.team = team;
    tank.x = team === "blue" ? 1000 : 1300;
    tank.y = 600;
    this.state.playerStats.get(client.sessionId)!.team = team;
  }
}

test("real GameRoom sockets remove and re-add stationary structures without leaking hidden updates", async (t) => {
  const lobby = lobbyRegistry.create("Visibility socket fixture");
  const http = createServer();
  const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
  server.define("visibility_fixture", VisibilityFixtureRoom);
  const rooms: Array<Room<GameState>> = [];
  t.after(async () => {
    await Promise.all(rooms.map(room => room.leave()));
    await server.gracefullyShutdown(false);
  });

  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const client = new Client(`ws://127.0.0.1:${address.port}`);
  const blue = await client.create<GameState>("visibility_fixture", { lobbyId: lobby.id });
  rooms.push(blue);
  const red = await client.joinById<GameState>(blue.id, { lobbyId: lobby.id });
  rooms.push(red);
  await until(() => blue.state.tanks.size === 2 && red.state.tanks.size === 2, "public lobby roster");
  assert.equal(blue.state.tanks.get(red.sessionId)!.x, 0);
  assert.equal(blue.state.bases.size, 0);
  blue.send("fixture", "begin");
  await until(() => blue.state.phase === "started" && red.state.phase === "started", "started projections");
  assert.equal(blue.state.tanks.has(red.sessionId), false);
  assert.equal(red.state.tanks.has(blue.sessionId), false);
  assert.equal(blue.state.bases.size, 0);
  assert.equal(blue.state.towers.size, 0);
  assert.equal(red.state.bases.size, 1);
  let baseRemovals = 0;
  let towerRemovals = 0;
  blue.state.bases.onRemove(() => baseRemovals++);
  blue.state.towers.onRemove(() => towerRemovals++);
  for (let cycle = 0; cycle < 3; cycle++) {
    blue.send("fixture", "reveal");
    await until(() => blue.state.bases.size === 1 && blue.state.towers.size === 1
      && blue.state.tanks.has(red.sessionId) && red.state.tanks.has(blue.sessionId), "stationary reveal");
    if (cycle > 0) {
      assert.equal(blue.state.towers.get("fixture-tower")!.shotCount, 9 * cycle);
      assert.equal(blue.state.bases.get("fixture-base")!.hp, 1000 - cycle);
    }
    blue.send("fixture", "conceal");
    await until(() => blue.state.bases.size === 0 && blue.state.towers.size === 0
      && !blue.state.tanks.has(red.sessionId) && !red.state.tanks.has(blue.sessionId), "conceal deletions");
    assert.equal(baseRemovals, cycle + 1);
    assert.equal(towerRemovals, cycle + 1);
    blue.send("fixture", "hidden-update");
    await until(() => red.state.towers.get("fixture-tower")!.shotCount === 9 * (cycle + 1)
      && red.state.bases.get("fixture-base")!.hp === 999 - cycle, "owner sees hidden updates");
    assert.equal(blue.state.bases.size, 0);
    assert.equal(blue.state.towers.size, 0);
  }
});

class RespawnFixtureRoom extends GameRoom {
    onCreate(options: { lobbyId: string }) {
      super.onCreate(options);
      this.setSimulationInterval();
      this["spawnTimer"] = Infinity;
      this.state.bases.forEach(base => { base.fireRange = 0; });
      this.onMessage("respawn_fixture", (client, payload: { action: string; team?: string; level?: number }) => {
        if (client.sessionId !== this.state.hostSessionId) throw new Error("Fixture control requires the host");
        const owner = this.state.tanks.get(client.sessionId)!;
        if (payload.action === "prepare") {
          const team = payload.team === "red" ? "red" : "blue";
          const base = team === "blue" ? BLUE_BASE_POSITION : RED_BASE_POSITION;
          this.state.tanks.forEach((tank, id) => {
            tank.team = id === this.clients[2].sessionId ? (team === "blue" ? "red" : "blue") : team;
            tank.state = "alive";
            tank.hp = tank.maxHp;
            tank.x = base.x;
            tank.y = base.y;
            tank.fireRange = 0;
            tank.sightRange = 2000;
          });
          owner.level = payload.level!;
          owner.skillPoints = 3;
          owner.abilities.get("tank-shield")!.level = 1;
          this.state.phase = "started";
        } else if (payload.action === "die") this["applyDamage"](owner, 100000);
        else if (payload.action === "tick") this.update(0);
        else if (payload.action === "end") this.state.phase = "ended";
        else throw new Error(`Unknown fixture action: ${payload.action}`);
      });
    }
  }

  test("three real clients observe level-scaled ghost respawns for both teams", async (t) => {
    const lobby = lobbyRegistry.create("Ghost respawn socket fixture");
    const http = createServer();
    const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
    server.define("respawn_fixture", RespawnFixtureRoom);
    const rooms: Array<Room<GameState>> = [];
    t.after(async () => {
      await Promise.all(rooms.map(room => room.leave()));
      await server.gracefullyShutdown(false);
    });
    await server.listen(0, "127.0.0.1");
    const address = http.address();
    assert.ok(address && typeof address !== "string");
    const client = new Client(`ws://127.0.0.1:${address.port}`);
    const owner = await client.create<GameState>("respawn_fixture", { lobbyId: lobby.id });
    rooms.push(owner);
    const teammate = await client.joinById<GameState>(owner.id, { lobbyId: lobby.id });
    rooms.push(teammate);
    const enemy = await client.joinById<GameState>(owner.id, { lobbyId: lobby.id });
    rooms.push(enemy);
    const action = (action: string) => owner.send("respawn_fixture", { action });
    for (const team of ["blue", "red"] as const) {
      for (const level of [1, 5]) {
        owner.send("respawn_fixture", { action: "prepare", team, level });
        await until(() => owner.state.tanks.get(owner.sessionId)?.team === team
          && owner.state.tanks.get(owner.sessionId)?.level === level
          && enemy.state.tanks.has(owner.sessionId), "visible alive tank before death");
        const beforeDeath = Date.now();
        action("die");
        await until(() => owner.state.tanks.get(owner.sessionId)?.state === "dead"
          && teammate.state.tanks.get(owner.sessionId)?.state === "dead"
          && !enemy.state.tanks.has(owner.sessionId), "owner and teammate get preview; enemy gets deletion");
        const tank = owner.state.tanks.get(owner.sessionId)!;
        const preview = { x: tank.x, y: tank.y };
        assert.ok(tank.respawnAt >= beforeDeath + level * 2000);
        assert.ok(tank.respawnAt <= Date.now() + level * 2000);
        assert.equal(teammate.state.tanks.get(owner.sessionId)!.respawnAt, 0);
        const base = team === "blue" ? BLUE_BASE_POSITION : RED_BASE_POSITION;
        const distance = Math.hypot(tank.x - base.x, tank.y - base.y);
        assert.ok(distance >= 80 && distance <= 140);
        owner.send("command", { x: 1200, y: 600 });
        owner.send("activate_ability", { abilityId: "tank-shield" });
        action("tick");
        await setTimeout(80);
        assert.equal(tank.state, "dead");
        assert.equal(tank.hp, 0);
        assert.equal(tank.hasMoveTarget, false);
        assert.equal(tank.abilities.get("tank-shield")!.activeUntil, 0);
        assert.deepEqual({ x: tank.x, y: tank.y }, preview);
        await setTimeout(Math.max(0, tank.respawnAt - Date.now() + 10));
        action("tick");
        await until(() => tank.state === "alive" && enemy.state.tanks.has(owner.sessionId), "server-confirmed respawn");
        assert.equal(tank.hp, tank.maxHp);
        assert.equal(tank.respawnAt, 0);
        assert.deepEqual({ x: tank.x, y: tank.y }, preview);
      }
    }
    action("die");
    await until(() => owner.state.tanks.get(owner.sessionId)?.state === "dead", "final preview");
    const tank = owner.state.tanks.get(owner.sessionId)!;
    action("end");
    await until(() => owner.state.phase === "ended", "match results");
    await setTimeout(Math.max(0, tank.respawnAt - Date.now() + 10));
    action("tick");
    await setTimeout(80);
    assert.equal(tank.state, "dead");
    assert.equal(tank.hp, 0);
  });
