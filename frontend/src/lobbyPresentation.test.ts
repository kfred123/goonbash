import assert from "node:assert/strict";
import { test } from "node:test";
import { GameState, Tank, type MatchPhase } from "shared";
import { BOT_DIFFICULTIES, canManageBots, getBotAddRequest, getBotMoveRequest, getBotRemoveRequest, getLobbyControls, newBotDraft } from "./lobbyPresentation.js";

test("bot drafts target their roster and respect live host and capacity", () => {
  const state = new GameState();
  state.hostSessionId = "host";
  const host = new Tank();
  host.ready = true;
  state.tanks.set("host", host);
  assert.deepEqual(BOT_DIFFICULTIES, ["easy", "medium", "hard"]);
  for (const team of ["red", "blue"] as const) {
    const draft = newBotDraft(team);
    assert.deepEqual(draft, { team, role: "damagedealer", difficulty: "medium" });
    draft.role = "scout";
    draft.difficulty = "hard";
    assert.deepEqual(getBotAddRequest(state, "host", draft), { team, role: "scout", difficulty: "hard" });
    assert.equal(getBotAddRequest(state, "peer", draft), null);
    state.phase = "countdown";
    assert.equal(getBotAddRequest(state, "host", draft), null);
    state.phase = "waiting";
  }
  for (let i = 0; i < 9; i++) state.tanks.set(`bot-${i}`, new Tank());
  assert.equal(getBotAddRequest(state, "host", newBotDraft("red")), null);
  state.tanks.delete("bot-0");
  assert.ok(getBotAddRequest(state, "host", newBotDraft("red")));
});

test("bot row requests use current membership, authority and opposite team", () => {
  const state = new GameState();
  state.hostSessionId = "host";
  state.tanks.set("host", new Tank());
  const bot = new Tank();
  bot.controllerType = "bot";
  bot.team = "red";
  state.tanks.set("bot", bot);
  assert.deepEqual(getBotMoveRequest(state, "host", "bot"), { botId: "bot", team: "blue" });
  bot.team = "blue";
  assert.deepEqual(getBotMoveRequest(state, "host", "bot"), { botId: "bot", team: "red" });
  assert.equal(getBotRemoveRequest(state, "host", "bot"), "bot");
  assert.equal(getBotMoveRequest(state, "host", "host"), null);
  assert.equal(getBotRemoveRequest(state, "host", "host"), null);
  assert.equal(getBotMoveRequest(state, "peer", "bot"), null);
  state.phase = "countdown";
  assert.equal(getBotRemoveRequest(state, "host", "bot"), null);
  state.phase = "waiting";
  state.tanks.delete("bot");
  assert.equal(getBotMoveRequest(state, "host", "bot"), null);
});

test("only a human host can manage bots while waiting", () => {
  const state = new GameState();
  state.hostSessionId = "host";
  state.tanks.set("host", new Tank());
  state.tanks.set("peer", new Tank());
  assert.equal(canManageBots(state, "host"), true);
  assert.equal(canManageBots(state, "peer"), false);
  state.phase = "countdown";
  assert.equal(canManageBots(state, "host"), false);
  state.phase = "waiting";
  state.tanks.get("host")!.controllerType = "bot";
  assert.equal(canManageBots(state, "host"), false);
});

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
