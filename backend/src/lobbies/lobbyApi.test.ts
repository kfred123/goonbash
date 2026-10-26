import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createApp } from "../app.js";
import { LobbyRegistry } from "./LobbyRegistry.js";

test("POST /lobbies rejects invalid names before mutation and returns the trimmed name", async (t) => {
  const registry = new LobbyRegistry();
  const server = createServer(createApp(registry));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/lobbies`;
  for (const name of [undefined, 42, {}, "", "   ", "x".repeat(49)]) {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /1 to 48/);
    assert.equal(registry.list().length, 0);
  }
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "  Named battle  " })
  });
  assert.equal(response.status, 201);
  const { lobby } = await response.json();
  assert.equal(lobby.name, "Named battle");
  assert.deepEqual((await (await fetch(url)).json()).lobbies, [lobby]);
});
