import assert from "node:assert/strict";
import { test } from "node:test";
import { allPlayersReady, isPreMatch, normalizeLobbyName } from "./lobby.js";
import { GameState } from "./state/GameState.js";
import { Tank } from "./state/Tank.js";

test("game names must be trimmed nonblank strings of at most 48 characters", () => {
  for (const value of [undefined, null, 42, {}, "", " \t ", "x".repeat(49)]) {
    assert.equal(normalizeLobbyName(value), undefined);
  }
  assert.equal(normalizeLobbyName("  Battle  "), "Battle");
  assert.equal(normalizeLobbyName("x".repeat(48)), "x".repeat(48));
});

test("all ready requires at least one participant and includes every participant", () => {
  assert.equal(allPlayersReady([]), false);
  assert.equal(allPlayersReady([{ ready: true }]), true);
  assert.equal(allPlayersReady([{ ready: true }, { ready: false }]), false);
  assert.equal(allPlayersReady([{ ready: true }, { ready: true }]), true);
  assert.equal(isPreMatch("countdown"), true);
  assert.equal(isPreMatch("started"), false);
});

test("readiness, countdown and cancellation survive schema snapshots and patches", () => {
  const state = new GameState();
  assert.equal(state.countdownSeconds, 0);
  assert.equal(state.countdownCancelReason, "");
  const tank = new Tank();
  assert.equal(tank.ready, false);
  state.tanks.set("player", tank);
  const decoded = new GameState();
  decoded.decode(state.encodeAll());
  state.discardAllChanges();
  tank.ready = true;
  state.phase = "countdown";
  state.countdownSeconds = 5;
  decoded.decode(state.encode());
  assert.equal(decoded.tanks.get("player")?.ready, true);
  assert.equal(decoded.phase, "countdown");
  assert.equal(decoded.countdownSeconds, 5);
  state.phase = "waiting";
  state.countdownSeconds = 0;
  state.countdownCancelReason = "player_left";
  decoded.decode(state.encode());
  assert.equal(decoded.countdownCancelReason, "player_left");
  assert.equal(decoded.countdownSeconds, 0);
});
