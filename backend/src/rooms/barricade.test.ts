import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, TestContext } from "node:test";
import type { Client } from "colyseus";
import { Barricade, INVALID_TARGET_MESSAGE, MatchPlayerStats, Projectile, Tank, Tower } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

function setup(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Barricade test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.state.phase = "started";
  room.state.bases.clear();
  room.state.towers.clear();
  const tank = Object.assign(new Tank(), {
    id: "tank", team: "blue", role: "tank", x: 1000, y: 800, hp: 100, fireRange: 0
  });
  room.state.tanks.set(tank.id, tank);
  room.state.playerStats.set(tank.id, Object.assign(new MatchPlayerStats(), { team: "blue" }));
  const ability = tank.abilities.get("tank-barricade")!;
  ability.level = 1;
  const replies: Array<{ type: string | number; message: unknown }> = [];
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  const client: Client = {
    id: tank.id, sessionId: tank.id, readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send(type, message?: unknown) {
      assert.ok(typeof type === "string" || typeof type === "number");
      replies.push({ type, message });
    },
    sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  room.clients.push(client);
  const place = (x: unknown = 1000, y: unknown = 900) =>
    room["onMessageHandlers"].activate_ability(client, { abilityId: "tank-barricade", targetX: x, targetY: y });
  const command = (targetId: string) => room["onMessageHandlers"].command(client, { targetId });
  t.after(() => {
    room.onDispose();
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, tank, ability, client, replies, place, command };
}

test("valid placement creates a lane-aligned barricade and starts its lifetime and cooldown", (t) => {
  const now = 1000000;
  t.mock.method(Date, "now", () => now);
  const { room, tank, ability, place } = setup(t);
  place();

  const barricade = room.state.barricades.get("barricade-0")!;
  assert.ok(barricade);
  assert.equal(barricade.ownerId, tank.id);
  assert.equal(barricade.team, tank.team);
  assert.deepEqual([barricade.x, barricade.y, barricade.angle], [1000, 900, Math.PI / 2]);
  assert.equal(barricade.length, 154.56);
  assert.equal(barricade.expiresAt, now + 60000);
  assert.equal(ability.cooldownEndsAt, now + 90000);
  assert.equal(ability.activeUntil, barricade.expiresAt);
});

test("barricades expire or are destroyed without changing the placement cooldown", (t) => {
  let now = 1000000;
  t.mock.method(Date, "now", () => now);
  const { room, ability, place } = setup(t);
  place();
  const barricade = room.state.barricades.get("barricade-0")!;
  const cooldownEndsAt = ability.cooldownEndsAt;
  room["applyDamage"](barricade, 75);
  assert.equal(barricade.hp, 75);
  assert.equal(room.state.barricades.has(barricade.id), true);
  room["applyDamage"](barricade, 75);
  assert.equal(room.state.barricades.has(barricade.id), false);
  assert.equal(ability.cooldownEndsAt, cooldownEndsAt);

  now += 90000;
  place(1050, 900);
  const expiring = room.state.barricades.get("barricade-1")!;
  const secondCooldownEndsAt = ability.cooldownEndsAt;
  room["expireBarricades"](expiring.expiresAt - 1);
  assert.equal(room.state.barricades.has(expiring.id), true);
  room["expireBarricades"](expiring.expiresAt);
  assert.equal(room.state.barricades.has(expiring.id), false);
  assert.equal(ability.cooldownEndsAt, secondCooldownEndsAt);
});

test("normal attacks target enemy barricades, ignore allied barricades, and pass through intervening barricades", (t) => {
  const { room, tank, command } = setup(t);
  tank.sightRange = 1000;
  tank.fireRange = 250;
  tank.fireDamage = 75;
  const friendly = Object.assign(new Barricade(), {
    id: "friendly", team: "blue", x: 1000, y: 900, expiresAt: Date.now() + 60000
  });
  const enemy = Object.assign(new Barricade(), {
    id: "enemy", team: "red", x: 1000, y: 900, expiresAt: Date.now() + 60000
  });
  room.state.barricades.set(friendly.id, friendly);
  room.state.barricades.set(enemy.id, enemy);

  command(friendly.id);
  assert.equal(tank.lockedTargetId, "");
  command(enemy.id);
  assert.equal(tank.lockedTargetId, enemy.id);
  room["resolveCombat"](0);
  assert.equal(tank.targetId, enemy.id);
  let shot = [...room.state.projectiles.values()][0];
  assert.equal(shot.targetId, enemy.id);
  shot.speed = 1000;
  room["updateProjectiles"](1000);
  assert.equal(enemy.hp, 75);
  assert.equal(friendly.hp, 150);

  tank.fireCooldown = 0;
  room["resolveCombat"](0);
  shot = [...room.state.projectiles.values()][0];
  shot.speed = 1000;
  room["updateProjectiles"](1000);
  assert.equal(room.state.barricades.has(enemy.id), false);
  assert.equal(room.state.barricades.has(friendly.id), true);

  const target = Object.assign(new Tank(), { id: "target", team: "red", x: 1200, y: 900, hp: 100 });
  const intervening = Object.assign(new Barricade(), {
    id: "intervening", team: "red", x: 1100, y: 850, angle: Math.PI / 2, expiresAt: Date.now() + 60000
  });
  room.state.tanks.set(target.id, target);
  room.state.barricades.set(intervening.id, intervening);
  const projectile = Object.assign(new Projectile(), {
    id: "pass-through", team: "blue", ownerId: tank.id, targetId: target.id,
    x: tank.x, y: tank.y, speed: 500, damage: 25
  });
  room.state.projectiles.set(projectile.id, projectile);
  room["updateProjectiles"](1000);
  assert.equal(target.hp, 75);
  assert.equal(intervening.hp, 150);
});

test("rejected placement reports state, range, lane, and overlap reasons without cooldown", (t) => {
  const { room, tank, ability, replies, place } = setup(t);
  const reject = (reason: string, configure: () => void, reset: () => void, x?: unknown, y?: unknown) => {
    configure();
    const cooldown = ability.cooldownEndsAt;
    const barricadeCount = room.state.barricades.size;
    place(x, y);
    assert.deepEqual(replies.at(-1), {
      type: INVALID_TARGET_MESSAGE, message: { action: "barricade", reason }
    });
    assert.equal(ability.cooldownEndsAt, cooldown);
    assert.equal(room.state.barricades.size, barricadeCount);
    reset();
  };

  reject("unavailable", () => { tank.role = "scout"; }, () => { tank.role = "tank"; });
  reject("unlearned", () => { ability.level = 0; }, () => { ability.level = 1; });
  reject("cooldown", () => { ability.cooldownEndsAt = Date.now() + 5000; }, () => { ability.cooldownEndsAt = 0; });
  reject("inactive", () => { tank.state = "dead"; }, () => { tank.state = "alive"; });
  reject("inactive", () => { room.state.phase = "waiting"; }, () => { room.state.phase = "started"; });
  reject("invalid_point", () => {}, () => {}, NaN, 900);
  reject("out_of_range", () => {}, () => {}, 1200, 900);
  reject("off_lane", () => {}, () => {}, 1000, 900 + 80);

  const tower = Object.assign(new Tower(), { id: "tower", x: 1000, y: 900 });
  room.state.towers.set(tower.id, tower);
  reject("overlap", () => {}, () => { room.state.towers.delete(tower.id); });

  const existing = Object.assign(new Barricade(), {
    id: "existing", x: 1015, y: 900, angle: Math.PI / 2, length: 154.56, hp: 150
  });
  room.state.barricades.set(existing.id, existing);
  reject("overlap", () => {}, () => { room.state.barricades.delete(existing.id); });
});
