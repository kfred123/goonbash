import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, type TestContext } from "node:test";
import type { Client } from "colyseus";
import { Base, INVALID_TARGET_MESSAGE, Minion, Tank, Tower } from "shared";
import type { RescueImpulseRejectionReason } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

function setup(t: TestContext) {
  const lobby = lobbyRegistry.create("Rescue Impulse test");
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.clock.stop();
  room.state.phase = "started";
  room.state.bases.clear();
  const healer = Object.assign(new Tank(), {
    id: "healer", role: "healer", team: "blue", x: 1000, y: 900, hp: 40, maxHp: 90,
    hasMoveTarget: true, moveTargetX: 1100, moveTargetY: 900, lockedTargetId: "existing"
  });
  const ally = Object.assign(new Tank(), {
    id: "ally", team: "blue", x: 1100, y: 900, hp: 20, maxHp: 170
  });
  room.state.tanks.set(healer.id, healer);
  room.state.tanks.set(ally.id, ally);
  const ability = healer.abilities.get("healer-rescue-impulse")!;
  ability.level = 1;
  const replies: Array<{ type: string | number; message: unknown }> = [];
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  const client: Client = {
    id: healer.id, sessionId: healer.id, state: 1, readyState: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send(type, message?: unknown) {
      assert.ok(typeof type === "string" || typeof type === "number");
      replies.push({ type, message });
    },
    sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  room.clients.push(client);
  const activate = (targetId: unknown = ally.id) =>
    room["onMessageHandlers"].activate_ability(client, { abilityId: "healer-rescue-impulse", targetId });
  t.after(() => {
    room.onDispose();
    room.clock.clear();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, healer, ally, ability, replies, activate };
}

test("Rescue Impulse heals immediately at exact range and preserves commands and other skills", (t) => {
  const { healer, ally, ability, replies, activate } = setup(t);
  t.mock.method(Date, "now", () => 100000);
  ally.x = healer.x + 150;
  ally.y = healer.y + 200;
  const aura = healer.abilities.get("healer-aura")!;
  const speed = healer.abilities.get("healer-speed")!;
  Object.assign(aura, { level: 2, cooldownEndsAt: 120000, cooldownMax: 15000, activeUntil: 104000 });
  Object.assign(speed, { level: 3, cooldownEndsAt: 115000, cooldownMax: 18000, activeUntil: 102000 });
  activate();
  assert.equal(ally.hp, 38);
  assert.equal(healer.hp, 40);
  assert.equal(ability.cooldownEndsAt, 120000);
  assert.equal(ability.cooldownMax, 20000);
  assert.equal(ability.activeUntil, 0);
  assert.deepEqual([aura.level, aura.cooldownEndsAt, aura.activeUntil], [2, 120000, 104000]);
  assert.deepEqual([speed.level, speed.cooldownEndsAt, speed.activeUntil], [3, 115000, 102000]);
  assert.equal(healer.hasMoveTarget, true);
  assert.equal(healer.moveTargetX, 1100);
  assert.equal(healer.lockedTargetId, "existing");
  assert.deepEqual(replies, []);
});

test("Rescue Impulse rank ten heals 45 HP and caps healing at progression-adjusted maximum HP", (t) => {
  const { ally, ability, activate } = setup(t);
  t.mock.method(Date, "now", () => 100000);
  ability.level = 10;
  activate();
  assert.equal(ally.hp, 65);
  assert.equal(ability.cooldownMax, 14600);
  assert.equal(ability.cooldownEndsAt, 114600);
  ally.hp = 160;
  ability.cooldownEndsAt = 0;
  activate();
  assert.equal(ally.hp, 170);
});

test("Rescue Impulse allows self-healing and still starts cooldown at full HP", (t) => {
  const { healer, ally, ability, activate } = setup(t);
  activate(healer.id);
  assert.equal(healer.hp, 58);
  assert.equal(ally.hp, 20);
  healer.hp = healer.maxHp;
  ability.cooldownEndsAt = 0;
  activate(healer.id);
  assert.equal(healer.hp, healer.maxHp);
  assert.equal(ability.cooldownMax, 20000);
  assert.ok(ability.cooldownEndsAt > Date.now());
  ally.hp = ally.maxHp;
  ability.cooldownEndsAt = 0;
  activate();
  assert.equal(ally.hp, ally.maxHp);
  assert.ok(ability.cooldownEndsAt > Date.now());
});

test("Rescue Impulse reports inactive, unavailable, unlearned and cooldown requests without mutations", (t) => {
  const { room, healer, ally, ability, replies, activate } = setup(t);
  const variants: Array<[() => void, RescueImpulseRejectionReason]> = [
    [() => { room.state.phase = "waiting"; }, "inactive"],
    [() => { room.state.phase = "countdown"; }, "inactive"],
    [() => { room.state.phase = "ended"; }, "inactive"],
    [() => { healer.state = "dead"; }, "inactive"],
    [() => { healer.hp = 0; }, "inactive"],
    ...["tank", "damagedealer", "scout"].map((role): [() => void, RescueImpulseRejectionReason] =>
      [() => { healer.role = role; }, "unavailable"]),
    [() => { ability.level = 0; }, "unlearned"],
    [() => { healer.abilities.delete("healer-rescue-impulse"); }, "unlearned"],
    [() => { ability.cooldownEndsAt = Date.now() + 5000; }, "cooldown"],
    [() => { room.state.tanks.delete(healer.id); }, "inactive"]
  ];
  for (const [configure, reason] of variants) {
    room.state.phase = "started";
    Object.assign(healer, { role: "healer", state: "alive", hp: 40 });
    ability.level = 1;
    ability.cooldownEndsAt = 0;
    healer.abilities.set("healer-rescue-impulse", ability);
    room.state.tanks.set(healer.id, healer);
    configure();
    const cooldown = ability.cooldownEndsAt;
    activate();
    assert.deepEqual(replies.at(-1), { type: INVALID_TARGET_MESSAGE, message: { action: "rescue", reason } });
    assert.equal(ally.hp, 20);
    assert.equal(ability.cooldownEndsAt, cooldown);
    assert.equal(healer.hasMoveTarget, true);
    assert.equal(healer.lockedTargetId, "existing");
  }
});

test("Rescue Impulse rejects invalid, hidden and unsupported targets without leaking their details", (t) => {
  const { room, healer, ally, ability, replies, activate } = setup(t);
  room.state.minions.set("minion", Object.assign(new Minion(), { id: "minion", team: "blue", x: 1100, y: 900 }));
  room.state.bases.set("base", Object.assign(new Base(), { id: "base", team: "blue", x: 1100, y: 900 }));
  room.state.towers.set("tower", Object.assign(new Tower(), { id: "tower", team: "blue", x: 1100, y: 900 }));
  for (const targetId of ["missing", "", null, 123, {}, "minion", "base", "tower"]) {
    activate(targetId);
    assert.deepEqual(replies.at(-1)?.message, { action: "rescue", reason: "invalid_target" });
    assert.equal(ability.cooldownEndsAt, 0);
  }
  room.state.minions.clear();
  room.state.bases.clear();
  room.state.towers.clear();
  const variants = [
    () => { ally.team = "red"; },
    () => { ally.state = "dead"; },
    () => { ally.hp = 0; },
    () => { ally.x = healer.x + 250.01; },
    () => { ally.x = NaN; },
    () => { ally.x = Infinity; },
    () => { healer.sightRange = 0; ally.sightRange = 0; }
  ];
  for (const configure of variants) {
    Object.assign(ally, { team: "blue", state: "alive", hp: 20, x: 1100, sightRange: 390 });
    healer.sightRange = 390;
    configure();
    const hp = ally.hp;
    activate();
    assert.deepEqual(replies.at(-1)?.message, { action: "rescue", reason: "invalid_target" });
    assert.equal(ally.hp, hp);
    assert.equal(healer.hp, 40);
    assert.equal(ability.cooldownEndsAt, 0);
  }
  assert.equal(room.state.projectiles.size, 0);
});

test("Rescue Impulse cannot heal twice during cooldown but is available at its exact deadline", (t) => {
  const { ally, ability, replies, activate } = setup(t);
  t.mock.method(Date, "now", () => 100000);
  activate();
  activate();
  assert.equal(ally.hp, 38);
  assert.equal(ability.cooldownEndsAt, 120000);
  assert.deepEqual(replies.at(-1)?.message, { action: "rescue", reason: "cooldown" });
  t.mock.method(Date, "now", () => 120000);
  activate();
  assert.equal(ally.hp, 56);
  assert.equal(ability.cooldownEndsAt, 140000);
});
