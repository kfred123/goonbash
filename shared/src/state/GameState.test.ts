import assert from "node:assert/strict";
import { test } from "node:test";
import { Base } from "./Base.js";
import { GameState } from "./GameState.js";
import { MatchPlayerStats } from "./MatchPlayerStats.js";

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
  assert.equal(decodedBase.fireRange, 250);
  assert.equal(decodedBase.fireCooldown, 600);
  assert.equal(decodedBase.fireCooldownMax, 1200);
  assert.equal(decodedBase.fireDamage, 24);
  assert.equal(decodedBase.targetId, "enemy-minion");
});
