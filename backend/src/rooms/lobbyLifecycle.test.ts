import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, type TestContext } from "node:test";
import type { Client } from "colyseus";
import { LOBBY_ACTION_ERROR, type MatchPhase } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

function setup(t: TestContext, count = 2) {
  const lobby = lobbyRegistry.create("  Countdown fixture  ");
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.clock.stop();
  const messages: Array<{ id: string; type: unknown; payload: unknown }> = [];
  const client = (id: string): Client => {
    const unexpected = () => { throw new Error("Unexpected transport action"); };
    return {
      id, sessionId: id, state: 1, readyState: 1, ref: new EventEmitter(),
      _reconnectionToken: "", _afterNextPatchQueue: [],
      send: (type, payload) => { messages.push({ id, type, payload }); },
      raw: unexpected, sendBytes: unexpected, enqueueRaw: unexpected, leave: unexpected, close: unexpected, error: unexpected
    };
  };
  const clients = Array.from({ length: count }, (_, i) => client(`player-${i}`));
  for (const value of clients) room.onJoin(value, { lobbyId: lobby.id, playerName: value.id });
  const send = (index: number, type: string, payload?: unknown) => room["onMessageHandlers"][type](clients[index], payload);
  const advance = (ms: number) => {
    room.clock.elapsedTime += ms;
    for (const timer of [...room.clock.delayed]) if (timer.active) timer.tick(ms);
  };
  const readyAll = () => clients.forEach((_, i) => send(i, "set_ready", true));
  t.after(() => {
    room.onDispose();
    room.clock.clear();
    for (const value of clients) room.onLeave(value, true);
  });
  return { room, lobby, clients, client, messages, send, advance, readyAll };
}

test("readiness is sender-only, reversible, validated, and locks team and role", t => {
  const { room, clients, client, messages, send } = setup(t);
  const host = room.state.tanks.get(clients[0].sessionId)!;
  const peer = room.state.tanks.get(clients[1].sessionId)!;
  assert.equal(host.ready, false);
  assert.equal(peer.ready, false);
  send(0, "change_team", "blue");
  send(0, "select_role", "healer");
  send(0, "set_ready", true);
  assert.equal(host.ready, true);
  send(0, "change_team", "red");
  send(0, "select_role", "tank");
  assert.equal(host.team, "blue");
  assert.equal(host.role, "healer");
  send(1, "set_ready", { sessionId: host.id, ready: false });
  send(1, "set_ready", "true");
  room["onMessageHandlers"].set_ready(client("missing"), true);
  assert.equal(host.ready, true);
  assert.equal(peer.ready, false);
  send(0, "set_ready", false);
  send(0, "change_team", "red");
  send(0, "select_role", "tank");
  assert.equal(host.team, "red");
  assert.equal(host.role, "tank");
  assert.ok(messages.length >= 5);
  assert.ok(messages.every(message => message.type === LOBBY_ACTION_ERROR));
  for (const phase of ["countdown", "started", "ended"] satisfies MatchPhase[]) {
    room.state.phase = phase;
    send(0, "set_ready", true);
    send(0, "change_team", "blue");
    send(0, "select_role", "healer");
    assert.equal(host.ready, false);
    assert.equal(host.team, "red");
    assert.equal(host.role, "tank");
  }
  room.state.phase = "waiting";
});

test("host and all participants must be ready and a newcomer starts not ready", t => {
  const { room, clients, client, send, readyAll, lobby } = setup(t);
  send(0, "start_game");
  send(1, "set_ready", true);
  send(0, "start_game");
  assert.equal(room.state.phase, "waiting");
  send(0, "set_ready", true);
  send(1, "start_game");
  assert.equal(room.state.phase, "waiting");
  const late = client("late");
  room.onJoin(late, { lobbyId: lobby.id });
  assert.equal(room.state.tanks.get(late.id)?.ready, false);
  send(0, "start_game");
  assert.equal(room.state.phase, "waiting");
  room.onLeave(late, true);
  readyAll();
  room["onMessageHandlers"]["*"](clients[0], "rename_lobby", "Changed");
  assert.equal(room.state.lobbyName, "Countdown fixture");
  assert.equal(lobbyRegistry.get(lobby.id)?.name, "Countdown fixture");
  send(0, "start_game");
  assert.equal(room.state.phase, "countdown");
});

test("countdown lasts 5000ms, rejects all changes, and initializes gameplay once", t => {
  const { room, clients, client, send, advance, readyAll, lobby } = setup(t);
  readyAll();
  send(0, "start_game");
  const host = room.state.tanks.get(clients[0].sessionId)!;
  const before = { team: host.team, role: host.role, x: host.x, y: host.y };
  assert.equal(room.state.countdownSeconds, 5);
  assert.equal(lobbyRegistry.list().some(value => value.id === lobby.id), false);
  advance(999);
  assert.equal(room.state.countdownSeconds, 5);
  assert.equal(room.state.phase, "countdown");
  send(0, "start_game");
  send(0, "set_ready", false);
  send(0, "change_team", "blue");
  send(0, "select_role", "healer");
  send(0, "command", { x: 1000, y: 900 });
  send(0, "activate_ability", { abilityId: "tank-shield" });
  send(0, "upgrade_ability", { abilityId: "tank-shield" });
  room.update(5000);
  assert.deepEqual({ team: host.team, role: host.role, x: host.x, y: host.y }, before);
  assert.equal(host.ready, true);
  assert.equal(host.hasMoveTarget, false);
  assert.equal(host.skillPoints, 0);
  assert.equal(room.state.minions.size, 0);
  assert.equal(room.state.towers.size, 0);
  const rejected = client("rejected");
  assert.throws(() => room.onJoin(rejected, { lobbyId: lobby.id }), /unavailable/);
  room.onLeave(rejected, false);
  assert.equal(room.state.phase, "countdown");
  assert.equal(lobbyRegistry.get(lobby.id)?.players, 2);
  advance(1);
  assert.equal(room.state.countdownSeconds, 4);
  advance(1000);
  assert.equal(room.state.countdownSeconds, 3);
  advance(1000);
  assert.equal(room.state.countdownSeconds, 2);
  advance(1000);
  assert.equal(room.state.countdownSeconds, 1);
  advance(999);
  assert.equal(room.state.phase, "countdown");
  advance(1);
  assert.equal(room.state.phase, "started");
  assert.equal(room.state.countdownSeconds, 0);
  assert.equal(room.state.towers.size, 24);
  const towers = [...room.state.towers.values()];
  send(0, "start_game");
  advance(5000);
  assert.deepEqual([...room.state.towers.values()], towers);
});

for (const leaving of [0, 1]) {
  test(`leaving ${leaving === 0 ? "host" : "peer"} cancels, preserves readiness, and requires a new countdown`, t => {
    const { room, clients, send, advance, readyAll, lobby } = setup(t);
    readyAll();
    send(0, "start_game");
    advance(3000);
    room.onLeave(clients[leaving], leaving === 0);
    const remaining = clients[1 - leaving];
    assert.equal(room.state.phase, "waiting");
    assert.equal(room.state.countdownCancelReason, "player_left");
    assert.equal(room.state.countdownSeconds, 0);
    assert.equal(room.state.hostSessionId, remaining.id);
    assert.equal(room.state.tanks.get(remaining.id)?.ready, true);
    assert.equal(lobbyRegistry.get(lobby.id)?.players, 1);
    advance(2000);
    assert.equal(room.state.phase, "waiting");
    room["onMessageHandlers"].start_game(remaining);
    assert.equal(room.state.countdownCancelReason, "");
    advance(4999);
    assert.equal(room.state.phase, "countdown");
    advance(1);
    assert.equal(room.state.phase, "started");
  });
}

test("empty rooms and disposal invalidate pending countdown callbacks", t => {
  const { room, clients, send, advance, readyAll, lobby } = setup(t, 1);
  readyAll();
  send(0, "start_game");
  room.onLeave(clients[0], true);
  assert.equal(lobbyRegistry.get(lobby.id), undefined);
  advance(5000);
  assert.equal(room.state.phase, "waiting");
  assert.equal(room.state.towers.size, 0);
});

test("disposing an occupied countdown never initializes gameplay afterwards", t => {
  const { room, send, advance, readyAll } = setup(t);
  readyAll();
  send(0, "start_game");
  room.onDispose();
  advance(5000);
  assert.equal(room.state.phase, "waiting");
  assert.equal(room.state.towers.size, 0);
});
