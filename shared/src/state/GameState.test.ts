import assert from "node:assert/strict";
import { test } from "node:test";
import { Base } from "./Base.js";
import { Barricade } from "./Barricade.js";
import { GameState } from "./GameState.js";
import { MatchPlayerStats } from "./MatchPlayerStats.js";
import { Tank } from "./Tank.js";

test("serializes human defaults and computer-player roster metadata", () => {
  const state = new GameState();
  const human = new Tank();
  const bot = Object.assign(new Tank(), {
    name: "Bot 1", team: "blue", role: "healer", ready: true,
    controllerType: "bot" as const, botDifficulty: "hard" as const
  });
  state.tanks.set("human", human);
  state.tanks.set("bot", bot);

  const decoded = new GameState();
  decoded.decode(state.encodeAll());

  assert.equal(decoded.tanks.get("human")?.controllerType, "human");
  assert.equal(decoded.tanks.get("human")?.botDifficulty, "");
  const decodedBot = decoded.tanks.get("bot");
  assert.deepEqual(
    [decodedBot?.controllerType, decodedBot?.botDifficulty, decodedBot?.team, decodedBot?.role, decodedBot?.ready],
    ["bot", "hard", "blue", "healer", true]
  );
});

test("serializes match outcome and player statistics for clients", () => {
  const state = new GameState();
  state.phase = "ended";
  state.winnerTeam = "blue";
  const player = new MatchPlayerStats();
  player.name = "Player One";
  player.team = "red";
  player.kills = 3;
  player.damageDealt = 125;
  state.playerStats.set("session-1", player);

  const decoded = new GameState();
  decoded.decode(state.encodeAll());

  assert.equal(decoded.phase, "ended");
  assert.equal(decoded.winnerTeam, "blue");
  const decodedPlayer = decoded.playerStats.get("session-1");
  assert.ok(decodedPlayer);
  assert.equal(decodedPlayer.name, "Player One");
  assert.equal(decodedPlayer.team, "red");
  assert.equal(decodedPlayer.kills, 3);
  assert.equal(decodedPlayer.level, 1);
  assert.equal(decodedPlayer.damageDealt, 125);
});

test("new match statistics start with zero kills, level one, and no damage", () => {
  const player = new MatchPlayerStats();

  assert.equal(player.kills, 0);
  assert.equal(player.level, 1);
  assert.equal(player.damageDealt, 0);
});

test("serializes main-base cannon stats and target for clients", () => {
  const state = new GameState();
  const base = new Base();
  base.id = "blue-base";
  base.team = "blue";
  base.fireCooldown = 600;
  base.targetId = "enemy-minion";
  state.bases.set(base.id, base);

  const decoded = new GameState();
  decoded.decode(state.encodeAll());

  const decodedBase = decoded.bases.get("blue-base");
  assert.ok(decodedBase);
  assert.equal(decodedBase.fireRange, 187.5);
  assert.equal(decodedBase.fireCooldown, 600);
  assert.equal(decodedBase.fireCooldownMax, 1200);
  assert.equal(decodedBase.fireDamage, 24);
  assert.equal(decodedBase.targetId, "enemy-minion");
});

test("serializes barricade position, ownership, orientation, health and lifetime", () => {
  const state = new GameState();
  const barricade = Object.assign(new Barricade(), {
    id: "barricade-1",
    ownerId: "tank-1",
    team: "blue",
    x: 1200,
    y: 900,
    angle: Math.PI / 2,
    length: 154.56,
    hp: 100,
    maxHp: 150,
    expiresAt: 123456
  });
  state.barricades.set(barricade.id, barricade);

  const decoded = new GameState();
  decoded.decode(state.encodeAll());

  const decodedBarricade = decoded.barricades.get("barricade-1");
  assert.ok(decodedBarricade);
  assert.equal(decodedBarricade.ownerId, "tank-1");
  assert.equal(decodedBarricade.team, "blue");
  assert.deepEqual([decodedBarricade.x, decodedBarricade.y], [1200, 900]);
  assert.equal(decodedBarricade.angle, Math.PI / 2);
  assert.equal(decodedBarricade.length, 154.56);
  assert.equal(decodedBarricade.hp, 100);
  assert.equal(decodedBarricade.maxHp, 150);
  assert.equal(decodedBarricade.expiresAt, 123456);
});
