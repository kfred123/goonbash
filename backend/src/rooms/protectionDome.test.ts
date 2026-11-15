import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, TestContext } from "node:test";
import type { Client } from "colyseus";
import { Base, GameState, Minion, ProtectionDome, Tank } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

function setup(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Protection dome test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.state.phase = "started";
  room.state.bases.clear();
  const tank = Object.assign(new Tank(), {
    id: "blue", team: "blue", role: "tank", x: 432, y: 765
  });
  room.state.tanks.set(tank.id, tank);
  const ability = tank.abilities.get("tank-protection-dome")!;
  ability.level = 1;
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  const client: Client = {
    id: tank.id, sessionId: tank.id, readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send: unexpected, sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  room.clients.push(client);
  const activate = () => room["onMessageHandlers"].activate_ability(client, { abilityId: "tank-protection-dome" });
  t.after(() => {
    room.onDispose();
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, tank, ability, activate };
}

test("Protection Dome activation creates a stationary synchronized area and starts its own cooldown", (t) => {
  const { room, tank, ability, activate } = setup(t);
  const now = Date.now();
  activate();

  assert.equal(room.state.protectionDomes.size, 1);
  const dome = [...room.state.protectionDomes.values()][0];
  assert.ok(dome instanceof ProtectionDome);
  assert.equal(dome.ownerId, tank.id);
  assert.equal(dome.team, tank.team);
  assert.equal(dome.x, 432);
  assert.equal(dome.y, 765);
  assert.equal(dome.radius, 180);
  assert.equal(dome.damageReduction, 0.35);
  assert.ok(dome.expiresAt >= now + 5000 && dome.expiresAt <= Date.now() + 5000);
  assert.equal(ability.activeUntil, dome.expiresAt);
  assert.ok(ability.cooldownEndsAt >= now + 30000);

  tank.x = 500;
  tank.y = 800;
  assert.equal(dome.x, 432);
  assert.equal(dome.y, 765);

  const cooldownEndsAt = ability.cooldownEndsAt;
  activate();
  assert.equal(room.state.protectionDomes.size, 1);
  assert.equal(ability.cooldownEndsAt, cooldownEndsAt);
});

test("Protection Dome stays active at its placed point after its owner dies", (t) => {
  const { room, tank, ability, activate } = setup(t);
  activate();
  const dome = [...room.state.protectionDomes.values()][0];
  const activeUntil = ability.activeUntil;

  room["killTank"](tank);

  assert.equal(room.state.protectionDomes.has(dome.id), true);
  assert.equal(ability.activeUntil, activeUntil);
  assert.deepEqual([dome.x, dome.y], [432, 765]);
});

test("Protection Dome reduces damage to living allies inside its inclusive radius only", (t) => {
  const { room, tank, activate } = setup(t);
  activate();
  const dome = [...room.state.protectionDomes.values()][0];
  const ally = Object.assign(new Tank(), {
    id: "ally", team: "blue", role: "healer", x: tank.x + 180, y: tank.y, hp: 100, maxHp: 100
  });
  room.state.tanks.set(ally.id, ally);
  room["applyDamage"](ally, 10);
  assert.equal(ally.hp, 93.5);

  const minion = Object.assign(new Minion(), {
    id: "minion", team: "blue", x: tank.x, y: tank.y, hp: 50, maxHp: 50
  });
  room.state.minions.set(minion.id, minion);
  room["applyDamage"](minion, 10);
  assert.equal(minion.hp, 43.5);

  ally.hp = 100;
  ally.x = tank.x + 180.01;
  room["applyDamage"](ally, 10);
  assert.equal(ally.hp, 90);

  const enemy = Object.assign(new Tank(), {
    id: "enemy", team: "red", role: "healer", x: tank.x, y: tank.y, hp: 100, maxHp: 100
  });
  room.state.tanks.set(enemy.id, enemy);
  room["applyDamage"](enemy, 10);
  assert.equal(enemy.hp, 90);

  const base = Object.assign(new Base(), { id: "base", team: "blue", x: tank.x, y: tank.y, hp: 100, maxHp: 100 });
  room.state.bases.set(base.id, base);
  room["applyDamage"](base, 10);
  assert.equal(base.hp, 90);

  dome.expiresAt = Date.now() - 1;
  ally.hp = 100;
  ally.x = tank.x;
  room["applyDamage"](ally, 10);
  assert.equal(ally.hp, 90);
});

test("Protection Dome damage reduction does not stack with Shield, Entrench, or overlapping domes", (t) => {
  const { room, tank, activate } = setup(t);
  activate();
  const dome = [...room.state.protectionDomes.values()][0];
  const strongerDome = Object.assign(new ProtectionDome(), {
    id: "stronger-dome", team: "blue", x: tank.x, y: tank.y, radius: 180,
    expiresAt: Date.now() + 5000, damageReduction: 0.44
  });
  room.state.protectionDomes.set(strongerDome.id, strongerDome);
  const shield = tank.abilities.get("tank-shield")!;
  const entrench = tank.abilities.get("tank-entrench")!;
  shield.level = 1;
  shield.activeUntil = Date.now() + 5000;
  entrench.level = 1;
  entrench.activeUntil = Date.now() + 5000;

  room["applyDamage"](tank, 100);
  assert.equal(tank.hp, 85);

  entrench.activeUntil = 0;
  tank.hp = 100;
  room["applyDamage"](tank, 100);
  assert.equal(tank.hp, 50);

  shield.activeUntil = 0;
  tank.hp = 100;
  room["applyDamage"](tank, 100);
  assert.ok(Math.abs(tank.hp - 44) < 1e-9);

  dome.expiresAt = Date.now() - 1;
  strongerDome.expiresAt = Date.now() - 1;
  tank.hp = 100;
  room["applyDamage"](tank, 100);
  assert.equal(tank.hp, 0);
});

test("Protection Dome rejects non-Tanks, unlearned abilities, cooldown, dead casters, and inactive matches", (t) => {
  const { room, tank, ability, activate } = setup(t);
  const attempts = [
    () => { tank.role = "healer"; },
    () => { tank.role = "tank"; ability.level = 0; },
    () => { ability.level = 1; ability.cooldownEndsAt = Date.now() + 5000; },
    () => { ability.cooldownEndsAt = 0; tank.state = "dead"; },
    () => { tank.state = "alive"; room.state.phase = "waiting"; }
  ];

  for (const configure of attempts) {
    configure();
    activate();
    assert.equal(room.state.protectionDomes.size, 0);
    assert.equal(ability.activeUntil, 0);
  }
});

test("expired Protection Domes are removed from synchronized game state", (t) => {
  const { room } = setup(t);
  const dome = Object.assign(new ProtectionDome(), {
    id: "expired", ownerId: "blue", team: "blue", expiresAt: Date.now() - 1
  });
  room.state.protectionDomes.set(dome.id, dome);

  room["expireProtectionDomes"](Date.now());

  assert.equal(room.state.protectionDomes.has(dome.id), false);
});
