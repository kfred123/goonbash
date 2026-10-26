import assert from "node:assert/strict";
import { test } from "node:test";
import { GameState, Tank, type MatchPhase } from "shared";
import { getLobbyControls } from "./lobbyPresentation.js";

test("lobby controls derive from confirmed membership, readiness and host", () => {
  const state = new GameState();
  state.hostSessionId = "host";
  assert.equal(getLobbyControls(state, "host").canStart, false);
  assert.equal(getLobbyControls(state, "missing").canReady, false);
  const host = Object.assign(new Tank(), { id: "host" });
  const peer = Object.assign(new Tank(), { id: "peer" });
  state.tanks.set(host.id, host);
  state.tanks.set(peer.id, peer);
  assert.deepEqual(getLobbyControls(state, "host"), { isHost: true, canChoose: true, canReady: true, canStart: false });
  peer.ready = true;
  assert.equal(getLobbyControls(state, "host").canStart, false);
  host.ready = true;
  assert.deepEqual(getLobbyControls(state, "host"), { isHost: true, canChoose: false, canReady: true, canStart: true });
  assert.equal(getLobbyControls(state, "peer").canStart, false);
  peer.ready = false;
  assert.equal(getLobbyControls(state, "host").canStart, false);
  assert.equal(getLobbyControls(state, "peer").canChoose, true);
  peer.ready = true;
  state.tanks.set("new", new Tank());
  assert.equal(getLobbyControls(state, "host").canStart, false);
  state.tanks.delete("new");
  state.hostSessionId = peer.id;
  assert.equal(getLobbyControls(state, "host").canStart, false);
  assert.equal(getLobbyControls(state, "peer").canStart, true);
  for (const phase of ["countdown", "started", "ended"] satisfies MatchPhase[]) {
    state.phase = phase;
    assert.deepEqual(getLobbyControls(state, "peer"), { isHost: true, canChoose: false, canReady: false, canStart: false });
  }
  state.phase = "waiting";
  assert.equal(getLobbyControls(state, "peer").canReady, true);
  assert.equal(getLobbyControls(state, "peer").canChoose, false);
});
