import assert from "node:assert/strict";
import { test, TestContext } from "node:test";
import { EventEmitter } from "node:events";
import type { Client } from "colyseus";
import { Base, INVALID_TARGET_MESSAGE, Minion, Tank, Tower } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { applyTankProgressionStats } from "./progressionService.js";

function setup(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Vision test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.state.phase = "started";
  room.state.bases.clear();
  const blue = Object.assign(new Tank(), { id: "blue", team: "blue", x: 1000, y: 600 });
  const red = Object.assign(new Tank(), { id: "red", team: "red", x: 1090, y: 600, fireRange: 0 });
  room.state.tanks.set(blue.id, blue);
  room.state.tanks.set(red.id, red);
  const replies: Array<{ type: string | number; message: unknown }> = [];
  const unexpected = () => { throw new Error("Unexpected transport action in room test"); };
  const client: Client = {
    sessionId: blue.id, id: blue.id, readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send(type, message?: unknown) {
      assert.ok(typeof type === "string" || typeof type === "number");
      replies.push({ type, message });
    },
    sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  t.after(() => {
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, blue, red, replies, client };
}

test("role sight initialization survives progression, fire range changes and respawn", (t) => {
  const { room, blue } = setup(t);
  for (const role of ["healer", "tank", "damagedealer"]) {
    blue.role = role;
    room["applyRoleStats"](blue);
    assert.equal(blue.sightRange, new Tower().sightRange);
    blue.level = 5;
    blue.fireRange = 500;
    applyTankProgressionStats(blue);
    assert.equal(blue.sightRange, 325);
    blue.state = "dead";
    blue.respawnAt = 0;
    room["resolveRespawns"](Date.now());
    assert.equal(blue.state, "alive");
    assert.equal(blue.sightRange, 325);
  }
});

test("hidden targets inside firing range are skipped; allied spotting enables fire without extending range", (t) => {
  const { room, blue, red } = setup(t);
  room["resolveCombat"](0);
  assert.equal(blue.targetId, "");
  assert.equal(room.state.projectiles.size, 0);
  const scout = Object.assign(new Minion(), { id: "scout", team: "blue", x: red.x, y: red.y, fireRange: 0 });
  room.state.minions.set(scout.id, scout);
  room["resolveCombat"](0);
  assert.equal(blue.targetId, red.id);
  assert.equal([...room.state.projectiles.values()].filter((shot) => shot.ownerId === blue.id).length, 1);
  red.x = 1300;
  scout.x = red.x;
  blue.fireCooldown = 0;
  room["resolveCombat"](0);
  assert.equal(blue.targetId, "");
});

test("observer changes are used immediately and locked pursuit ends without hidden movement", (t) => {
  const { room, blue, red } = setup(t);
  const scout = Object.assign(new Minion(), { id: "scout", team: "blue", x: red.x, y: red.y, fireRange: 0 });
  room.state.minions.set(scout.id, scout);
  assert.equal(room["teamVision"]("blue").canSee(red), true);
  blue.lockedTargetId = red.id;
  blue.hasMoveTarget = true;
  scout.hp = 0;
  room["updateTankMovement"](1);
  assert.equal(blue.lockedTargetId, "");
  assert.equal(blue.hasMoveTarget, false);
  assert.equal(blue.x, 1000);
  scout.hp = 50;
  scout.x = 1500;
  assert.equal(room["teamVision"]("blue").canSee(red), false);
  scout.x = red.x;
  scout.team = "red";
  assert.equal(room["teamVision"]("blue").canSee(red), false);
  scout.team = "blue";
  room.state.minions.delete(scout.id);
  assert.equal(room["teamVision"]("blue").canSee(red), false);
});

test("concealed attack IDs are rejected; movement into dark terrain is still accepted", (t) => {
  const { room, blue, red, replies, client } = setup(t);
  room["onMessageHandlers"].command(client, { targetId: red.id });
  assert.equal(blue.lockedTargetId, "");
  assert.deepEqual(replies, [{ type: INVALID_TARGET_MESSAGE, message: { action: "attack", reason: "invalid_target" } }]);
  room["onMessageHandlers"].command(client, { x: 2000, y: 600 });
  assert.equal(blue.hasMoveTarget, true);
  assert.equal(blue.moveTargetX, 2000);
  red.x = 1020;
  room["onMessageHandlers"].command(client, { targetId: red.id });
  assert.equal(blue.lockedTargetId, red.id);
  red.x = 1090;
  room["resolveCombat"](0);
  assert.equal(blue.lockedTargetId, "");
  assert.equal(blue.targetId, "");
});

test("concealed rocket rejection preserves cooldown; launched rocket still hits through fog", (t) => {
  const { room, blue, red, replies, client } = setup(t);
  blue.role = "damagedealer";
  const ability = blue.abilities.get("damagedealer-homing-rocket")!;
  ability.level = 1;
  const payload = { abilityId: "damagedealer-homing-rocket", targetId: red.id };
  room["onMessageHandlers"].activate_ability(client, payload);
  assert.equal(ability.cooldownEndsAt, 0);
  assert.equal(room.state.projectiles.size, 0);
  assert.deepEqual(replies[0], { type: INVALID_TARGET_MESSAGE, message: { action: "rocket", reason: "invalid_target" } });
  red.x = 1020;
  room["onMessageHandlers"].activate_ability(client, payload);
  assert.equal(room.state.projectiles.size, 1);
  assert.ok(ability.cooldownEndsAt > Date.now());
  red.x = 1090;
  const hp = red.hp;
  room["updateProjectiles"](1000);
  assert.ok(red.hp < hp);
  assert.equal(room.state.projectiles.size, 0);
});

test("rejections do not distinguish missing, dead, near-hidden and far-hidden targets", (t) => {
  const { room, blue, red, replies, client } = setup(t);
  blue.role = "damagedealer";
  const ability = blue.abilities.get("damagedealer-homing-rocket")!;
  ability.level = 1;
  for (const variant of ["missing", "near", "far", "dead"]) {
    red.x = variant === "far" ? 2000 : 1090;
    red.state = variant === "dead" ? "dead" : "alive";
    const targetId = variant === "missing" ? "unknown" : red.id;
    replies.length = 0;
    room["onMessageHandlers"].command(client, { targetId, x: 1500, y: 600 });
    room["onMessageHandlers"].activate_ability(client, { abilityId: "damagedealer-homing-rocket", targetId });
    assert.deepEqual(replies, [
      { type: INVALID_TARGET_MESSAGE, message: { action: "attack", reason: "invalid_target" } },
      { type: INVALID_TARGET_MESSAGE, message: { action: "rocket", reason: "invalid_target" } }
    ]);
    assert.equal(blue.hasMoveTarget, false);
    assert.equal(ability.cooldownEndsAt, 0);
  }
});

test("ordinary shots launched in vision still hit after their target enters grass fog", (t) => {
  const { room, blue, red } = setup(t);
  red.x = 1020;
  room["resolveCombat"](0);
  assert.equal(room.state.projectiles.size, 1);
  red.x = 1090;
  const hp = red.hp;
  room["updateProjectiles"](1000);
  assert.equal(red.hp, hp - blue.fireDamage);
});

test("towers and bases use team visibility and destroyed observers grant no sight", (t) => {
  const { room, blue, red } = setup(t);
  blue.fireRange = 0;
  for (const Type of [Tower, Base]) {
    room.state.towers.clear();
    room.state.bases.clear();
    room.state.projectiles.clear();
    const structure = Object.assign(new Type(), { id: "structure", team: "blue", x: blue.x, y: blue.y });
    if (structure instanceof Tower) room.state.towers.set(structure.id, structure);
    else room.state.bases.set(structure.id, structure);
    room["resolveCombat"](0);
    assert.equal(structure.targetId, "");
    const scout = Object.assign(new Minion(), { id: "scout", team: "blue", x: red.x, y: red.y, fireRange: 0 });
    room.state.minions.set(scout.id, scout);
    room["resolveCombat"](0);
    assert.equal(structure.targetId, red.id);
    structure.hp = 0;
    room.state.minions.clear();
    assert.equal(room["teamVision"]("blue").canSee(red), false);
  }
});

test("minions resume lane movement when an enemy in firing range becomes concealed", (t) => {
  const { room, blue, red } = setup(t);
  blue.fireRange = 0;
  blue.state = "dead";
  const minion = Object.assign(new Minion(), { id: "minion", team: "blue", x: 1000, y: 600, waypointX: 1500, waypointY: 600 });
  room.state.minions.set(minion.id, minion);
  red.x = 1020;
  room["resolveCombat"](0);
  assert.equal(minion.targetId, red.id);
  red.x = 1090;
  room.update(100);
  assert.equal(minion.targetId, "");
  assert.ok(minion.x > 1000);
});
