import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, type TestContext } from "node:test";
import type { Client } from "colyseus";
import { BLUE_BASE_POSITION, RED_BASE_POSITION, Tank, TeamVision, getVisionEntities } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

function setup(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Respawn test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room["spawnTimer"] = Infinity;
  const unexpected = () => { throw new Error("Unexpected transport action"); };
  const client: Client = {
    sessionId: "owner", id: "owner", readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send: unexpected, sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  room.onJoin(client, { lobbyId: lobby.id });
  room.state.phase = "started";
  t.after(() => {
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, client, tank: room.state.tanks.get(client.sessionId)! };
}

for (const team of ["blue", "red"] as const) {
  for (const level of [1, 5, 10]) {
    test(`${team} level ${level}: death relocates once and respawns exactly at the deadline`, (t) => {
      let now = 100000;
      t.mock.method(Date, "now", () => now);
      t.mock.method(Math, "random", () => 0.5);
      const { room, tank, client } = setup(t);
      const base = team === "blue" ? BLUE_BASE_POSITION : RED_BASE_POSITION;
      const initialBase = tank.team === "blue" ? BLUE_BASE_POSITION : RED_BASE_POSITION;
      assert.ok(Math.hypot(tank.x - initialBase.x, tank.y - initialBase.y) >= 80);
      Object.assign(tank, {
        team, level, role: "healer", xp: 17, skillPoints: 3,
        x: 1200, y: 900, maxHp: 145, hp: 10,
        hasMoveTarget: true, moveTargetX: 1400, moveTargetY: 900,
        targetId: "enemy", lockedTargetId: "enemy"
      });
      const ability = tank.abilities.get("healer-speed")!;
      Object.assign(ability, { level: 3, activeUntil: now + 60000, cooldownEndsAt: now + 90000 });
      room["applyDamage"](tank, 100);
      assert.equal(tank.state, "dead");
      assert.equal(tank.hp, 0);
      assert.equal(tank.targetId, "");
      assert.equal(tank.lockedTargetId, "");
      assert.equal(tank.hasMoveTarget, false);
      assert.equal(ability.activeUntil, 0);
      const preview = { x: tank.x, y: tank.y };
      const distance = Math.hypot(tank.x - base.x, tank.y - base.y);
      assert.ok(distance >= 80 && distance <= 140);
      assert.ok(tank.x >= 60 && tank.x <= 2340 && tank.y >= 60 && tank.y <= 1740);
      const deadline = now + level * 2000;
      assert.equal(tank.respawnAt, deadline);

      room["onMessageHandlers"].command(client, { x: 1400, y: 900 });
      room["onMessageHandlers"].command(client, { targetId: "enemy" });
      room["onMessageHandlers"].activate_ability(client, { abilityId: "healer-speed" });
      room["onMessageHandlers"].upgrade_ability(client, { abilityId: "healer-speed" });
      room["updateTankMovement"](1);
      room["applyDamage"](tank, 50);
      assert.equal(tank.respawnAt, deadline);
      assert.deepEqual({ x: tank.x, y: tank.y }, preview);
      assert.equal(ability.activeUntil, 0);
      assert.equal(ability.level, 3);
      assert.equal(tank.skillPoints, 3);
      assert.equal(tank.hasMoveTarget, false);
      assert.equal(tank.lockedTargetId, "");
      now = deadline - 1;
      room.update(0);
      assert.equal(tank.state, "dead");
      now = deadline;
      room.update(0);
      assert.equal(tank.state, "alive");
      assert.equal(tank.hp, 145);
      assert.equal(tank.respawnAt, 0);
      assert.deepEqual({ x: tank.x, y: tank.y }, preview);
      assert.equal(tank.role, "healer");
      assert.equal(tank.level, level);
      assert.equal(tank.xp, 17);
      assert.equal(ability.level, 3);
      assert.equal(ability.cooldownEndsAt, 190000);

      tank.level = level + 1;
      now += 500;
      room["applyDamage"](tank, 1000);
      assert.equal(tank.respawnAt, now + (level + 1) * 2000);
    });
  }
}

test("dead previews neither fight nor heal nor grant vision, and kill XP uses the death site", (t) => {
  t.mock.method(Date, "now", () => 100000);
  const { room, tank } = setup(t);
  tank.x = 1200;
  tank.y = 600;
  const nearDeath = Object.assign(new Tank(), { id: "near-death", team: "red", x: 1200, y: 600, fireRange: 0 });
  const nearBase = Object.assign(new Tank(), { id: "near-base", team: tank.team, x: tank.x < 1000 ? 240 : 2160, y: 900, role: "healer", fireRange: 0 });
  const base = room.state.bases.get(`${tank.team}-base`)!;
  nearBase.x = base.x;
  room.state.tanks.set(nearDeath.id, nearDeath);
  room.state.tanks.set(nearBase.id, nearBase);
  room["applyDamage"](tank, 1000);
  assert.equal(nearDeath.xp, 50);
  assert.equal(nearBase.xp, 0);
  assert.equal(tank.xp, 0);
  const aura = nearBase.abilities.get("healer-aura")!;
  aura.level = 1;
  aura.activeUntil = 200000;
  nearBase.x = tank.x;
  nearBase.y = tank.y;
  room["resolveHealerAuras"](1, 100000);
  assert.equal(tank.hp, 0);
  const enemy = Object.assign(new Tank(), { id: "enemy", team: tank.team === "blue" ? "red" : "blue", x: tank.x, y: tank.y });
  room.state.tanks.clear();
  room.state.tanks.set(tank.id, tank);
  room.state.tanks.set(enemy.id, enemy);
  room.state.bases.clear();
  room["resolveCombat"](0);
  assert.equal(room.state.projectiles.size, 0);
  assert.equal(enemy.targetId, "");
  assert.equal(room["findLivingEntity"](tank.id), undefined);
  assert.equal(new TeamVision(tank.team, getVisionEntities(room.state)).observers.length, 0);
});

test("ended matches do not reactivate a preview even after its deadline", (t) => {
  let now = 100000;
  t.mock.method(Date, "now", () => now);
  const { room, tank } = setup(t);
  room["applyDamage"](tank, 1000);
  room.state.phase = "ended";
  now = tank.respawnAt + 1000;
  room.update(16);
  assert.equal(tank.state, "dead");
  assert.equal(tank.hp, 0);
});
