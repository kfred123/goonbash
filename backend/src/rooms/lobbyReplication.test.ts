import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Server } from "colyseus";
import { Client, type Room } from "colyseus.js";
import { GameState, LOBBY_ACTION_ERROR, type LobbyInfo } from "shared";
import { createApp } from "../app.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

async function until(predicate: () => boolean, label: string, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `Timeout: ${label}`);
    await setTimeout(10);
  }
}

test("live named lobbies synchronize readiness, full countdown, rejected joins and host/peer cancellation", async t => {
  const rooms = new Map<string, GameRoom>();
  class ObservedRoom extends GameRoom {
    onCreate(options: { lobbyId: string }) {
      super.onCreate(options);
      rooms.set(options.lobbyId, this);
    }
  }
  const http = createServer(createApp());
  const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
  server.define("game_room", ObservedRoom).filterBy(["lobbyId"]);
  const connections = new Set<Room<GameState>>();
  t.after(async () => {
    await Promise.all([...connections].map(room => room.leave()));
    await server.gracefullyShutdown(false);
  });
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const client = new Client(`ws://127.0.0.1:${address.port}`);
  const join = async (lobby: LobbyInfo, name: string) => {
    const room = await client.joinOrCreate<GameState>("game_room", { lobbyId: lobby.id, playerName: name });
    connections.add(room);
    return room;
  };
  const leave = async (room: Room<GameState>) => {
    connections.delete(room);
    await room.leave();
  };
  const create = async () => {
    const response = await fetch(`${baseUrl}/lobbies`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "  Live ready match  " })
    });
    assert.equal(response.status, 201);
    const { lobby } = await response.json() as { lobby: LobbyInfo };
    assert.equal(lobby.name, "Live ready match");
    const host = await join(lobby, "Host");
    const peer = await join(lobby, "Peer");
    await until(() => host.state.tanks.size === 2 && peer.state.tanks.size === 2, "two-player roster");
    return { lobby, host, peer, canonical: rooms.get(lobby.id)! };
  };
  const ready = async (host: Room<GameState>, peer: Room<GameState>) => {
    host.send("set_ready", true);
    peer.send("set_ready", true);
    await until(() => [host, peer].every(room => [...room.state.tanks.values()].every(tank => tank.ready)), "ready on both clients");
  };
  const listings = async () => (await (await fetch(`${baseUrl}/lobbies`)).json() as { lobbies: LobbyInfo[] }).lobbies;

  {
    const { lobby, host, peer, canonical } = await create();
    const errors: string[] = [];
    host.onMessage(LOBBY_ACTION_ERROR, error => errors.push(error.message));
    peer.onMessage(LOBBY_ACTION_ERROR, error => errors.push(error.message));
    host.send("start_game");
    await until(() => errors.length === 1, "early host start rejected");
    assert.equal(host.state.phase, "waiting");
    host.send("change_team", "blue");
    host.send("select_role", "healer");
    await until(() => peer.state.tanks.get(host.sessionId)?.role === "healer"
      && peer.state.tanks.get(host.sessionId)?.team === "blue", "team and role synchronized");
    await ready(host, peer);
    host.send("select_role", "tank");
    host.send("change_team", "red");
    await until(() => errors.length === 3, "ready player cannot change choices");
    assert.equal(canonical.state.tanks.get(host.sessionId)?.role, "healer");
    host.send("set_ready", false);
    await until(() => !peer.state.tanks.get(host.sessionId)?.ready, "not ready replicated");
    host.send("select_role", "tank");
    await until(() => peer.state.tanks.get(host.sessionId)?.role === "tank", "unready role change allowed");
    await ready(host, peer);
    const seen = [new Set<number>(), new Set<number>()];
    [host, peer].forEach((room, index) => room.onStateChange(state => {
      if (state.phase !== "countdown") return;
      seen[index].add(state.countdownSeconds);
      assert.equal(state.tanks.size, 2);
      assert.ok([...state.tanks.values()].every(tank => tank.ready && tank.x === 0 && tank.y === 0));
      assert.equal(state.minions.size, 0);
      assert.equal(state.bases.size, 0);
      assert.equal(state.towers.size, 0);
    }));
    const startedAt = Date.now();
    host.send("start_game");
    await until(() => host.state.phase === "countdown" && peer.state.phase === "countdown", "shared countdown");
    assert.equal(canonical.state.towers.size, 0);
    assert.equal((await listings()).some(value => value.id === lobby.id), false);
    await assert.rejects(join(lobby, "Stale browser"), /unavailable/);
    assert.equal(canonical.state.tanks.size, 2);
    assert.equal(lobbyRegistry.get(lobby.id)?.players, 2);
    assert.equal(canonical.state.phase, "countdown");
    await assert.rejects(client.create("game_room", { lobbyId: lobby.id }), /already has a room/);
    assert.equal(rooms.get(lobby.id), canonical);
    host.send("set_ready", false);
    host.send("start_game");
    await until(() => host.state.phase === "started" && peer.state.phase === "started", "shared start");
    assert.ok(Date.now() - startedAt >= 5000);
    assert.deepEqual([...seen[0]], [5, 4, 3, 2, 1]);
    assert.deepEqual([...seen[1]], [5, 4, 3, 2, 1]);
    assert.equal(canonical.state.towers.size, 24);
    assert.equal(host.state.lobbyName, "Live ready match");
    await leave(peer);
    await leave(host);
    await until(() => !lobbyRegistry.get(lobby.id), "started empty lobby removed");
  }

  for (const departingHost of [false, true]) {
    const { lobby, host, peer, canonical } = await create();
    host.onMessage(LOBBY_ACTION_ERROR, () => {});
    peer.onMessage(LOBBY_ACTION_ERROR, () => {});
    await ready(host, peer);
    host.send("start_game");
    await until(() => peer.state.phase === "countdown", "cancellable countdown");
    await setTimeout(1000);
    const departed = departingHost ? host : peer;
    const remaining = departingHost ? peer : host;
    await leave(departed);
    await until(() => remaining.state.phase === "waiting" && remaining.state.tanks.size === 1, "cancelled roster");
    assert.equal(remaining.state.hostSessionId, remaining.sessionId);
    assert.equal(remaining.state.countdownCancelReason, "player_left");
    assert.equal(remaining.state.tanks.get(remaining.sessionId)?.ready, true);
    assert.equal(canonical.state.towers.size, 0);
    assert.equal((await listings()).find(value => value.id === lobby.id)?.players, 1);
    const newcomer = await join(lobby, "New participant");
    newcomer.onMessage(LOBBY_ACTION_ERROR, () => {});
    await until(() => remaining.state.tanks.size === 2, "join after cancellation");
    assert.equal(remaining.state.tanks.get(newcomer.sessionId)?.ready, false);
    newcomer.send("set_ready", true);
    await until(() => [...remaining.state.tanks.values()].every(tank => tank.ready), "newcomer ready");
    const restartAt = Date.now();
    remaining.send("start_game");
    await until(() => remaining.state.phase === "countdown", "explicit new countdown");
    await setTimeout(4100);
    assert.equal(remaining.state.phase, "countdown", "old deadline must not start the replacement countdown");
    assert.equal(canonical.state.towers.size, 0);
    await until(() => remaining.state.phase === "started" && newcomer.state.phase === "started", "replacement countdown completed");
    assert.ok(Date.now() - restartAt >= 5000);
    await leave(newcomer);
    await leave(remaining);
    await until(() => !lobbyRegistry.get(lobby.id), "cancelled/restarted empty lobby removed");
  }
});
