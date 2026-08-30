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