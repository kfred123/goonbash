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

test("renames an existing lobby", () => {
  const registry = new LobbyRegistry();
  const lobby = registry.create("Original name");

  assert.equal(registry.rename(lobby.id, "Renamed game").name, "Renamed game");
  assert.equal(registry.get(lobby.id)?.name, "Renamed game");
  assert.throws(() => registry.rename(lobby.id, "  "), /required/);
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