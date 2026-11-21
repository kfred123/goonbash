import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Client as ServerClient, Server } from "colyseus";
import { Client, type Room } from "colyseus.js";
import { GameState, type LobbyInfo } from "shared";
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

test("reconnection restores the same participant with a fresh visibility-scoped state", async t => {
  const rooms = new Map<string, ObservedRoom>();
  class ObservedRoom extends GameRoom {
    reconnectionWindow: number | "manual" | undefined;

    override onCreate(options: { lobbyId: string }) {
      super.onCreate(options);
      rooms.set(options.lobbyId, this);
    }

    override allowReconnection(client: ServerClient, seconds: number | "manual") {
      this.reconnectionWindow = seconds;
      return super.allowReconnection(client, seconds);
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
  const lobbyResponse = await fetch(`${baseUrl}/lobbies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Reconnect and visibility" })
  });
  assert.equal(lobbyResponse.status, 201);
  const { lobby } = await lobbyResponse.json() as { lobby: LobbyInfo };
  const firstRoom = await client.joinOrCreate<GameState>("game_room", {
    lobbyId: lobby.id, playerName: "Returning player"
  });
  connections.add(firstRoom);
  const peer = await client.joinOrCreate<GameState>("game_room", {
    lobbyId: lobby.id, playerName: "Opponent"
  });
  connections.add(peer);
  const canonical = rooms.get(lobby.id)!;
  firstRoom.send("add_bot", { team: "red", role: "tank", difficulty: "hard" });
  await until(() => firstRoom.state.tanks.size === 3 && peer.state.tanks.size === 3, "mixed human and bot lobby");
  firstRoom.send("set_ready", true);
  peer.send("set_ready", true);
  await until(() => [...firstRoom.state.tanks.values()].every(value => value.ready), "humans and bot ready");
  firstRoom.send("start_game");
  await until(() => firstRoom.state.phase === "started" && peer.state.phase === "started", "mixed match start");
  const participantId = firstRoom.sessionId;
  const peerId = peer.sessionId;
  const tank = canonical.state.tanks.get(participantId)!;
  const stats = canonical.state.playerStats.get(participantId)!;
  tank.team = "blue";
  tank.x = 1000;
  tank.y = 900;
  tank.role = "scout";
  tank.level = 3;
  stats.kills = 2;
  stats.damageDealt = 84;
  const enemy = canonical.state.tanks.get(peerId)!;
  enemy.team = "red";
  enemy.x = 1050;
  enemy.y = 900;
  const bot = [...canonical.state.tanks.values()].find(value => value.controllerType === "bot")!;
  bot.x = 2200;
  bot.y = 1600;
  await until(() => firstRoom.state.phase === "started"
    && firstRoom.state.tanks.has(peerId), "visible enemy before disconnect");

  const reconnectionToken = firstRoom.reconnectionToken;
  await firstRoom.leave(false);
  connections.delete(firstRoom);
  await until(() => canonical.reconnectionWindow === 30, "30-second server reservation");
  enemy.x = 2200;
  enemy.y = 1600;
  stats.kills = 3;
  stats.damageDealt = 126;

  const resumed = await client.reconnect<GameState>(reconnectionToken, GameState);
  connections.add(resumed);
  await until(() => resumed.state.tanks.has(participantId), "restored tank projection");
  assert.equal(resumed.sessionId, participantId);
  assert.equal(resumed.state.tanks.has(participantId), true);
  assert.equal(resumed.state.tanks.has(peerId), false);
  assert.deepEqual(
    [resumed.state.tanks.get(participantId)?.controllerType, resumed.state.tanks.get(participantId)?.x,
      resumed.state.tanks.get(participantId)?.y, resumed.state.tanks.get(participantId)?.role,
      resumed.state.tanks.get(participantId)?.level],
    ["human", 1000, 900, "scout", 3]
  );
  assert.deepEqual(
    [resumed.state.playerStats.get(participantId)?.kills, resumed.state.playerStats.get(participantId)?.damageDealt],
    [3, 126]
  );
  assert.equal(canonical.state.tanks.get(participantId)?.controllerType, "human");

  await resumed.leave();
  connections.delete(resumed);
  assert.equal(canonical.state.tanks.get(participantId)?.controllerType, "bot");
  assert.equal(canonical.state.playerStats.get(participantId)?.kills, 3);
  assert.equal(lobbyRegistry.get(lobby.id)?.players, 3);
  canonical.state.phase = "ended";
  canonical.state.winnerTeam = "blue";
  await until(() => peer.state.phase === "ended", "match results state");
  assert.equal(peer.state.playerStats.get(participantId)?.kills, 3);
  await peer.leave();
  connections.delete(peer);
});
