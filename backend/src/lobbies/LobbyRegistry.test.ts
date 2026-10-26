import assert from "node:assert/strict";
import { test } from "node:test";
import { LobbyRegistry } from "./LobbyRegistry.js";

test("creates and lists a waiting lobby", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Test game", 2);

  assert.deepEqual(registry.list(), [lobby]);
  assert.equal(lobby.status, "waiting");
});

test("tracks capacity and removes empty lobbies", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Test game", 2);

  assert.equal(registry.join(lobby.id).players, 1);
  assert.equal(registry.join(lobby.id).status, "full");
  assert.throws(() => registry.join(lobby.id), /full/);

  registry.leave(lobby.id);
  assert.equal(registry.get(lobby.id)?.status, "waiting");
  registry.leave(lobby.id);
  assert.equal(registry.get(lobby.id), undefined);
});

test("rejects unknown lobbies", () => {
  const registry = new LobbyRegistry();

  assert.throws(() => registry.join("missing"), /not found/);
});

test("requires a valid immutable creation-time name", () => {
  const registry = new LobbyRegistry();
  for (const name of ["", "  ", "x".repeat(49)]) {
    assert.throws(() => registry.create(name), /1 to 48/);
    assert.equal(registry.list().length, 0);
  }
  const lobby = registry.create("  Original name  ");
  lobby.name = "Changed copy";
  assert.equal(registry.get(lobby.id)?.name, "Original name");
  assert.equal(registry.create("x".repeat(48)).name.length, 48);
});

test("countdown blocks joins and listings and cancellation restores capacity status", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Countdown", 2);
  registry.join(lobby.id);
  registry.setCountdown(lobby.id, true);
  assert.deepEqual(registry.list(), []);
  assert.throws(() => registry.join(lobby.id), /counting down/);
  assert.equal(registry.get(lobby.id)?.players, 1);
  registry.setCountdown(lobby.id, false);
  assert.equal(registry.list()[0].status, "waiting");
  registry.join(lobby.id);
  registry.setCountdown(lobby.id, true);
  registry.setCountdown(lobby.id, false);
  assert.equal(registry.get(lobby.id)?.status, "full");
});

test("a lobby can only own one room and failed claims cannot release its owner", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Single room");
  registry.claimRoom(lobby.id);
  assert.throws(() => registry.claimRoom(lobby.id), /already has a room/);
  registry.join(lobby.id);
  registry.releaseRoom(lobby.id);
  registry.claimRoom(lobby.id);
  assert.equal(registry.get(lobby.id)?.players, 1);
});

test("removes a lobby once its only player leaves before the match starts", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Waiting game", 4);

  registry.join(lobby.id);
  registry.leave(lobby.id);

  assert.equal(registry.get(lobby.id), undefined);
});

test("removes a lobby once its only player leaves after the match has started", () => {
  // LobbyRegistry has no notion of match phase; leaving the lobby empty removes it
  // regardless of whether GameRoom's state.phase is "waiting" or "started".
  const registry = new LobbyRegistry();
  const lobby = registry.create("Started game", 4);

  registry.join(lobby.id);
  registry.leave(lobby.id);

  assert.equal(registry.get(lobby.id), undefined);
});