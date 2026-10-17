import assert from "node:assert/strict";
import { test } from "node:test";
import { GameState, MatchPlayerStats, Projectile, Tank } from "shared";
import { endMatchAfterBaseDestroyed, getWinnerAfterBaseDestroyed, recordPlayerDamage, recordPlayerKill, removeLeavingPlayerTank } from "./matchResults.js";

test("credits only actual damage to an opposing player's combat statistics", () => {
  const stats = { team: "blue", kills: 0, damageDealt: 4 };

  assert.equal(recordPlayerDamage(stats, "red", 10, 0), 10);
  assert.equal(stats.damageDealt, 14);
  assert.equal(recordPlayerDamage(stats, "blue", 10, 0), 0);
  assert.equal(recordPlayerDamage(stats, "red", 10, 10), 0);
  assert.equal(recordPlayerDamage(undefined, "red", 10, 0), 0);
  assert.equal(stats.damageDealt, 14);
});

test("credits one kill only when the player damages an opposing tank to zero", () => {
  const stats = { team: "red", kills: 0, damageDealt: 0 };

  assert.equal(recordPlayerKill(stats, "blue"), true);
  assert.equal(stats.kills, 1);
  assert.equal(recordPlayerKill(stats, "red"), false);
  assert.equal(recordPlayerKill(undefined, "blue"), false);
  assert.equal(stats.kills, 1);
});

test("determines the winning team from the destroyed main base", () => {
  assert.equal(getWinnerAfterBaseDestroyed("red"), "blue");
  assert.equal(getWinnerAfterBaseDestroyed("blue"), "red");
  assert.equal(getWinnerAfterBaseDestroyed("neutral"), null);
});

test("ends a started match for either destroyed main base and ignores later end attempts", () => {
  for (const [losingTeam, winnerTeam] of [["red", "blue"], ["blue", "red"]] as const) {
    const state = new GameState();
    state.phase = "started";
    state.projectiles.set("projectile", new Projectile());

    assert.equal(endMatchAfterBaseDestroyed(state, losingTeam), true);
    assert.equal(state.phase, "ended");
    assert.equal(state.winnerTeam, winnerTeam);
    assert.equal(state.projectiles.size, 0);
    assert.equal(endMatchAfterBaseDestroyed(state, winnerTeam), false);
    assert.equal(state.winnerTeam, winnerTeam);
  }
});

test("keeps a disconnected player's match record when removing their tank on leave", () => {
  const state = new GameState();
  const tank = new Tank();
  const stats = new MatchPlayerStats();
  tank.name = stats.name = "Leaving Player";
  tank.team = stats.team = "blue";
  state.tanks.set("session-1", tank);
  state.playerStats.set("session-1", stats);

  removeLeavingPlayerTank(state, "session-1");

  assert.equal(state.tanks.has("session-1"), false);
  assert.equal(state.playerStats.get("session-1"), stats);
});
