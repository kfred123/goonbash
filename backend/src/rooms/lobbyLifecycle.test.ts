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

test("only the waiting host can add and remove valid bots, and bots fill lobby seats", t => {
  const { room, clients, messages, send, lobby, client } = setup(t);
  const valid = { team: "blue", role: "healer", difficulty: "hard" };
  send(1, "add_bot", valid);
  send(0, "add_bot", { ...valid, team: "green" });
  send(0, "add_bot", { ...valid, role: "invalid" });
  send(0, "add_bot", { ...valid, difficulty: "impossible" });
  assert.equal(room.state.tanks.size, 2);
  send(0, "add_bot", valid);
  const bot = [...room.state.tanks.values()].find(tank => tank.controllerType === "bot")!;
  assert.ok(bot);
  assert.deepEqual([bot.team, bot.role, bot.botDifficulty, bot.ready], ["blue", "healer", "hard", true]);
  assert.equal(room.state.playerStats.get(bot.id)?.team, "blue");
  assert.equal(lobbyRegistry.get(lobby.id)?.players, 3);
  send(1, "remove_bot", bot.id);
  send(0, "remove_bot", clients[1].id);
  assert.ok(room.state.tanks.has(bot.id));
  send(0, "remove_bot", bot.id);
  assert.equal(room.state.tanks.has(bot.id), false);
  assert.equal(room.state.playerStats.has(bot.id), false);
  assert.equal(lobbyRegistry.get(lobby.id)?.players, 2);
  room.state.phase = "countdown";
  send(0, "add_bot", valid);
  room.state.phase = "waiting";
  for (let i = 0; i < 8; i++) send(0, "add_bot", valid);
  assert.equal(room.state.tanks.size, 10);
  assert.equal(lobbyRegistry.get(lobby.id)?.status, "full");
  send(0, "add_bot", valid);
  assert.equal(room.state.tanks.size, 10);
  assert.throws(() => room.onJoin(client("late"), {}), /full/);
  assert.ok(messages.length >= 8);
});

test("bot seats affect team assignment and never receive host authority", t => {
  const { room, clients, client, lobby, send } = setup(t, 1);
  send(0, "add_bot", { team: "red", role: "tank", difficulty: "easy" });
  const peer = client("late");
  room.onJoin(peer, {});
  assert.equal(room.state.tanks.get(peer.id)?.team, "blue");
  room.onLeave(clients[0], true);
  assert.equal(room.state.hostSessionId, peer.id);
  room.onLeave(peer, true);
  assert.equal(room.state.hostSessionId, "");
  assert.equal(lobbyRegistry.get(lobby.id), undefined);
});

test("bots use validated commands and role abilities during the room simulation", t => {
  const { room, clients, send } = setup(t, 1);
  send(0, "add_bot", { team: "blue", role: "tank", difficulty: "medium" });
  const bot = [...room.state.tanks.values()].find(tank => tank.controllerType === "bot")!;
  const enemy = room.state.tanks.get(clients[0].id)!;
  room.state.phase = "started";
  bot.x = 1000; bot.y = 900; bot.hp = bot.maxHp * 0.7; bot.skillPoints = 1;
  enemy.team = "red"; enemy.x = 1100; enemy.y = 900;
  room.update(16);
  assert.equal(bot.lockedTargetId, enemy.id);
  assert.equal(bot.abilities.get("tank-shield")?.level, 1);
  room.update(500);
  assert.ok(bot.abilities.get("tank-shield")!.cooldownEndsAt > Date.now());
  enemy.x = 2000;
  let rejected = false;
  room["issueTankCommand"](bot, { targetId: enemy.id }, () => { rejected = true; });
  assert.equal(rejected, true);
  room.update(500);
  assert.notEqual(bot.lockedTargetId, enemy.id);
  assert.equal(bot.hasMoveTarget, true);
});

test("bot movement and attacks use the normal simulation and fire cooldown", t => {
  const { room, clients, send } = setup(t, 1);
  send(0, "add_bot", { team: "blue", role: "damagedealer", difficulty: "easy" });
  const bot = [...room.state.tanks.values()].find(tank => tank.controllerType === "bot")!;
  const enemy = room.state.tanks.get(clients[0].id)!;
  room.state.phase = "started";
  bot.x = 1000; bot.y = 900;
  enemy.team = "red"; enemy.x = 2000; enemy.y = 900;
  room.update(100);
  assert.ok(bot.x > 1000);
  assert.equal(bot.lockedTargetId, "");
  enemy.x = bot.x + 100;
  bot.fireCooldown = 0;
  room.update(500);
  assert.equal(bot.lockedTargetId, enemy.id);
  assert.ok(bot.fireCooldown > 0);
  const afterShot = bot.fireCooldown;
  room.update(10);
  assert.ok(bot.fireCooldown > 0 && bot.fireCooldown < afterShot);
});

test("a bot spends successive points on distinct abilities and casts targeted and ground specials in the room", t => {
  const { room, clients, send } = setup(t, 1);
  send(0, "add_bot", { team: "blue", role: "damagedealer", difficulty: "medium" });
  const bot = [...room.state.tanks.values()].find(tank => tank.controllerType === "bot")!;
  const enemy = room.state.tanks.get(clients[0].id)!;
  Object.assign(bot, { x: 1000, y: 900, skillPoints: 3 });
  Object.assign(enemy, { team: "red", x: 1250, y: 900 });
  room.state.phase = "started";
  for (let i = 0; i < 5; i++) room["updateBots"](Date.now());

  assert.equal(bot.skillPoints, 0);
  const shots = [...room.state.projectiles.values()].filter(p => p.ownerId === bot.id);
  assert.deepEqual(shots.filter(p => p.isHomingRocket).map(p => p.targetId), [enemy.id]);
  assert.deepEqual(shots.filter(p => p.isMortar).map(p => [p.landingX, p.landingY]), [[enemy.x, enemy.y]]);
  assert.ok(bot.abilities.get("damagedealer-mortar")!.cooldownEndsAt > Date.now());
});

test("a wounded medium healer breaks its lock, uses speed and stops taking fire behind a teammate", t => {
  const { room, clients, send } = setup(t);
  send(0, "add_bot", { team: "blue", role: "healer", difficulty: "medium" });
  const bot = [...room.state.tanks.values()].find(tank => tank.controllerType === "bot")!;
  const ally = room.state.tanks.get(clients[0].id)!, enemy = room.state.tanks.get(clients[1].id)!;
  Object.assign(ally, { team: "blue", x: 980, y: 850 });
  Object.assign(enemy, { team: "red", x: 1150, y: 900 });
  Object.assign(bot, { x: 1020, y: 900, hp: bot.maxHp / 2, lockedTargetId: enemy.id });
  bot.abilities.get("healer-speed")!.level = 1;
  room.state.phase = "started";

  room.update(100);
  assert.equal(enemy.targetId, bot.id);
  assert.equal(bot.lockedTargetId, "");
  assert.ok(bot.moveTargetX < ally.x && bot.x < 1020);
  assert.ok(bot.abilities.get("healer-speed")!.cooldownEndsAt > Date.now());
  for (let i = 0; i < 30; i++) room.update(100);
  assert.equal(enemy.targetId, ally.id);
  assert.ok(bot.x < ally.x && bot.hp > 0);
  const coveredHp = bot.hp;
  for (let i = 0; i < 15; i++) room.update(100);
  assert.equal(bot.hp, coveredHp);
});

test("intentional leave immediately transfers the existing started-match tank to a bot", async t => {
  const { room, clients } = setup(t);
  room.state.phase = "started";
  const tank = room.state.tanks.get(clients[0].sessionId)!;
  const stats = room.state.playerStats.get(clients[0].sessionId)!;
  tank.x = 1234;
  tank.y = 567;
  tank.role = "healer";
  tank.level = 4;
  stats.kills = 2;
  stats.damageDealt = 91;

  await room.onLeave(clients[0], true);

  assert.equal(room.state.tanks.get(tank.id), tank);
  assert.deepEqual([tank.controllerType, tank.botDifficulty, tank.x, tank.y, tank.role, tank.level],
    ["bot", "medium", 1234, 567, "healer", 4]);
  assert.deepEqual([stats.kills, stats.damageDealt], [2, 91]);
});

test("unexpected disconnect reserves for 30 seconds and transfers the same tank after expiry", async t => {
  const { room, clients } = setup(t);
  room.state.phase = "started";
  const tank = room.state.tanks.get(clients[0].sessionId)!;
  const stats = room.state.playerStats.get(clients[0].sessionId)!;
  tank.x = 1234;
  tank.y = 567;
  tank.role = "scout";
  tank.level = 3;
  stats.kills = 1;
  stats.damageDealt = 42;
  Object.defineProperty(room, "allowReconnection", {
    value: (_client: Client, seconds: number) => {
      assert.equal(seconds, 30);
      throw false;
    }
  });

  await room.onLeave(clients[0], false);

  assert.equal(room.state.tanks.get(tank.id), tank);
  assert.deepEqual([tank.controllerType, tank.botDifficulty, tank.x, tank.y, tank.role, tank.level],
    ["bot", "medium", 1234, 567, "scout", 3]);
  assert.deepEqual([stats.kills, stats.damageDealt], [1, 42]);
});

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
