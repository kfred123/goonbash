import assert from "node:assert/strict";
import { test } from "node:test";
import { reconnectWithinDeadline } from "./reconnectAttempt.js";

test("a hung reconnect is bounded by the deadline and a late room is closed", async () => {
  let resolveAttempt!: (room: { close(): void }) => void;
  let closed = 0;
  const attempt = new Promise<{ close(): void }>(resolve => { resolveAttempt = resolve; });
  const pending = reconnectWithinDeadline(
    () => attempt,
    Date.now() + 20,
    new AbortController().signal,
    room => room.close()
  );
  await assert.rejects(pending, /timed out/);
  resolveAttempt({ close: () => { closed++; } });
  await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  assert.equal(closed, 1);
});

test("cancelling an in-flight reconnect closes its eventual room", async () => {
  let resolveAttempt!: (room: { close(): void }) => void;
  let closed = 0;
  const attempt = new Promise<{ close(): void }>(resolve => { resolveAttempt = resolve; });
  const controller = new AbortController();
  const pending = reconnectWithinDeadline(
    () => attempt,
    Date.now() + 1000,
    controller.signal,
    room => room.close()
  );
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  resolveAttempt({ close: () => { closed++; } });
  await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  assert.equal(closed, 1);
});
