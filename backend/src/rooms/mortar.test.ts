import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, TestContext } from "node:test";
import type { Client } from "colyseus";
import {
  Base, GameState, INVALID_TARGET_MESSAGE, MatchPlayerStats, Minion, MORTAR_IMPACT_MESSAGE,
  mortarPointRejection, Tank, Tower
} from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { mortarDamage } from "./ability.js";
import { purchaseAbilityUpgrade } from "./progressionService.js";
import { updateClientView } from "./VisibilitySerializer.js";

function setup(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Mortar test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.state.phase = "started";
  room.state.bases.clear();
  const blue = Object.assign(new Tank(), {
    id: "blue", team: "blue", role: "damagedealer", x: 1000, y: 600, fireDamage: 12, fireRange: 0
  });
  const red = Object.assign(new Tank(), { id: "red", team: "red", x: 1500, y: 600, fireRange: 0 });
  room.state.tanks.set(blue.id, blue);
  room.state.tanks.set(red.id, red);
  room.state.playerStats.set(blue.id, Object.assign(new MatchPlayerStats(), { team: "blue" }));
  const ability = blue.abilities.get("damagedealer-mortar")!;
  ability.level = 1;
  function connection(tank: Tank) {
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
    return { client, replies };
  }
  const first = connection(blue);
  const second = connection(red);
  const fire = (targetX: unknown = red.x, targetY: unknown = red.y) =>
    room["onMessageHandlers"].activate_ability(first.client, { abilityId: "damagedealer-mortar", targetX, targetY });
  t.after(() => {
    room.onDispose();
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, blue, red, ability, first, second, fire };
}

test("Mortar validates exact range, world bounds and malformed points and scales launch damage", () => {
  assert.equal(mortarPointRejection({ x: 0, y: 0 }, 900, 0, 900), null);
  assert.equal(mortarPointRejection({ x: 0, y: 0 }, 900.01, 0, 900), "out_of_range");
  for (const value of [NaN, Infinity, undefined, null, "600", -1]) {
    assert.equal(mortarPointRejection({ x: 0, y: 0 }, value, 0, 900), "invalid_point");
  }
  assert.equal(mortarDamage(12, 1), 24);
  assert.ok(Math.abs(mortarDamage(12, 10) - 45.6) < 1e-9);
});

test("Mortar purchases are independent, role-specific and capped", (t) => {
  const { blue, ability } = setup(t);
  ability.level = 0;
  blue.skillPoints = 1;
  assert.equal(purchaseAbilityUpgrade(blue, "damagedealer-mortar"), true);
  assert.equal(ability.level, 1);
  assert.equal(blue.skillPoints, 0);
  assert.equal(blue.abilities.get("damagedealer-homing-rocket")!.level, 0);
  assert.equal(purchaseAbilityUpgrade(blue, "damagedealer-mortar"), false);
  blue.skillPoints = 1;
  ability.level = 10;
  assert.equal(purchaseAbilityUpgrade(blue, "damagedealer-mortar"), false);
  blue.role = "tank";
  ability.level = 0;
  assert.equal(purchaseAbilityUpgrade(blue, "damagedealer-mortar"), false);
  assert.equal(blue.skillPoints, 1);
});

test("rejected activations report reasons without changing commands or cooldown", (t) => {
  const { room, blue, ability, first, fire } = setup(t);
  blue.hasMoveTarget = true;
  blue.lockedTargetId = "existing";
  const variants: Array<[() => void, string]> = [
    [() => { blue.role = "healer"; }, "unavailable"],
    [() => { blue.role = "damagedealer"; ability.level = 0; }, "unlearned"],
    [() => { ability.level = 1; ability.cooldownEndsAt = Date.now() + 5000; }, "cooldown"],
    [() => { ability.cooldownEndsAt = 0; blue.state = "dead"; }, "inactive"],
    [() => { blue.state = "alive"; room.state.phase = "waiting"; }, "inactive"]
  ];
  for (const [configure, reason] of variants) {
    configure();
    const cooldown = ability.cooldownEndsAt;
    fire();
    assert.deepEqual(first.replies.at(-1), { type: INVALID_TARGET_MESSAGE, message: { action: "mortar", reason } });
    assert.equal(ability.cooldownEndsAt, cooldown);
    assert.equal(room.state.projectiles.size, 0);
    assert.equal(blue.hasMoveTarget, true);
    assert.equal(blue.lockedTargetId, "existing");
  }
  room.state.phase = "started";
  for (const [x, y, reason] of [[NaN, 600, "invalid_point"], [1000, Infinity, "invalid_point"],
    [2500, 600, "invalid_point"], [1900.01, 600, "out_of_range"]] as const) {
    fire(x, y);
    assert.deepEqual(first.replies.at(-1)?.message, { action: "mortar", reason });
    assert.equal(ability.cooldownEndsAt, 0);
  }
});

test("blind ground shots commit independent cooldown and one delayed fixed-point hit", (t) => {
  const { room, blue, red, ability, fire } = setup(t);
  assert.equal(room["teamVision"]("blue").canSee(red), false);
  blue.hasMoveTarget = true;
  fire();
  const shot = [...room.state.projectiles.values()][0];
  assert.equal(shot.isMortar, true);
  assert.equal(shot.targetId, "");
  assert.equal(ability.cooldownMax, 24000);
  assert.equal(blue.abilities.get("damagedealer-homing-rocket")!.cooldownEndsAt, 0);
  assert.equal(blue.hasMoveTarget, true);
  room["updateProjectiles"](1499);
  assert.equal(red.hp, 100);
  assert.ok(shot.x < 1500);
  room["updateProjectiles"](2);
  assert.equal(red.hp, 76);
  assert.equal(room.state.projectiles.size, 0);
  assert.equal(room["mortarFlights"].size, 0);
  room["updateProjectiles"](1500);
  assert.equal(red.hp, 76);
});

test("impact uses current enemy centers, never intercepts or follows, and ignores allies and ruins", (t) => {
  const { room, blue, red, fire } = setup(t);
  const minion = Object.assign(new Minion(), { id: "minion", team: "red", x: 1620, y: 600, hp: 100 });
  const outside = Object.assign(new Tower(), { id: "outside", team: "red", x: 1620.01, y: 600, hp: 100 });
  const tower = Object.assign(new Tower(), { id: "tower", team: "red", x: 1500, y: 600, hp: 200 });
  const base = Object.assign(new Base(), { id: "base", team: "red", x: 1500, y: 600, hp: 200 });
  const ally = Object.assign(new Minion(), { id: "ally", team: "blue", x: 1500, y: 600, hp: 100 });
  const ruin = Object.assign(new Tower(), { id: "ruin", team: "red", x: 1500, y: 600, hp: 0 });
  const dead = Object.assign(new Tank(), { id: "dead", team: "red", x: 1500, y: 600, state: "dead" });
  room.state.minions.set(minion.id, minion);
  room.state.minions.set(ally.id, ally);
  for (const value of [outside, tower, ruin]) room.state.towers.set(value.id, value);
  room.state.bases.set(base.id, base);
  room.state.tanks.set(dead.id, dead);
  fire();
  red.x = 1800;
  blue.x = 1500;
  room["updateProjectiles"](1500);
  assert.equal(red.hp, 100);
  assert.equal(blue.hp, 100);
  assert.equal(dead.hp, 100);
  assert.equal(minion.hp, 76);
  assert.equal(ally.hp, 100);
  assert.equal(outside.hp, 100);
  assert.equal(ruin.hp, 0);
  assert.equal(tower.hp, 128);
  assert.equal(base.hp, 128);
});

test("damage snapshots survive upgrades and shooter death; later shots use new values", (t) => {
  const { room, blue, red, ability, fire } = setup(t);
  fire();
  blue.fireDamage = 20;
  ability.level = 10;
  blue.state = "dead";
  room["updateProjectiles"](1500);
  assert.equal(red.hp, 76);
  blue.state = "alive";
  ability.cooldownEndsAt = 0;
  fire();
  assert.equal(ability.cooldownMax, 17520);
  room["updateProjectiles"](1500);
  assert.equal(red.hp, 0);
});

test("rank-ten blast deals 45.6 unit and 136.8 building damage from 12 launch fire damage", (t) => {
  const { room, red, ability, fire } = setup(t);
  red.hp = 1000;
  ability.level = 10;
  const tower = Object.assign(new Tower(), { id: "rank10-tower", team: "red", x: red.x, y: red.y, hp: 1000 });
  room.state.towers.set(tower.id, tower);
  fire();
  room["updateProjectiles"](1500);
  assert.ok(Math.abs(red.hp - 954.4) < 1e-9);
  assert.ok(Math.abs(tower.hp - 863.2) < 1e-9);
});

test("zero-distance and empty shots retain full delay and cooldown without retargeting", (t) => {
  const { room, blue, red, ability, fire } = setup(t);
  fire(blue.x, blue.y);
  room["updateProjectiles"](1499);
  assert.equal(room.state.projectiles.size, 1);
  room["updateProjectiles"](1);
  assert.equal(room.state.projectiles.size, 0);
  assert.equal(red.hp, 100);
  assert.ok(ability.cooldownEndsAt > Date.now());
});

test("late-arriving enemies are hit, shields mitigate and multi-kills award once", (t) => {
  const { room, blue, red, ability, fire } = setup(t);
  red.role = "tank";
  red.abilities.get("tank-shield")!.activeUntil = Date.now() + 10000;
  fire();
  room["updateProjectiles"](1500);
  assert.equal(red.hp, 88);
  ability.cooldownEndsAt = 0;
  red.abilities.get("tank-shield")!.activeUntil = 0;
  red.hp = 24;
  blue.x = 1400;
  const minion = Object.assign(new Minion(), { id: "minion", team: "red", x: 2000, y: 600, hp: 24 });
  const tower = Object.assign(new Tower(), { id: "tower", team: "red", x: 1500, y: 600, hp: 72 });
  room.state.minions.set(minion.id, minion);
  room.state.towers.set(tower.id, tower);
  fire();
  minion.x = 1500;
  room["updateProjectiles"](1500);
  assert.equal(red.state, "dead");
  assert.equal(room.state.minions.has(minion.id), false);
  assert.equal(tower.hp, 0);
  assert.equal(tower.targetId, "");
  assert.equal(blue.xp, 60);
  const stats = room.state.playerStats.get(blue.id)!;
  assert.equal(stats.kills, 1);
  assert.equal(stats.damageDealt, 12 + 24 + 24 + 72);
  room["updateProjectiles"](1500);
  assert.equal(blue.xp, 60);
  room["resolveRespawns"](Date.now() + 4000);
  assert.equal(red.state, "alive");
  assert.equal(red.hp, red.maxHp);
});

test("base destruction stops later shots and clears flight metadata; removal and dispose also clean up", (t) => {
  const { room, ability, fire } = setup(t);
  const base = Object.assign(new Base(), { id: "base", team: "red", x: 1500, y: 600, hp: 72 });
  room.state.bases.set(base.id, base);
  fire();
  ability.cooldownEndsAt = 0;
  fire();
  room["updateProjectiles"](1500);
  assert.equal(room.state.phase, "ended");
  assert.equal(room.state.winnerTeam, "blue");
  assert.equal(room.state.projectiles.size, 0);
  assert.equal(room["mortarFlights"].size, 0);
  room.state.phase = "started";
  ability.cooldownEndsAt = 0;
  fire();
  room.state.projectiles.clear();
  room["updateProjectiles"](1);
  assert.equal(room["mortarFlights"].size, 0);
  ability.cooldownEndsAt = 0;
  fire();
  room.state.phase = "ended";
  room.update(1500);
  assert.equal(room["mortarFlights"].size, 0);
  room.state.phase = "started";
  ability.cooldownEndsAt = 0;
  fire();
  room.onDispose();
  assert.equal(room.state.projectiles.size, 0);
});

test("impact messages are victim-free and scoped to firing team or currently visible ground", (t) => {
  const { room, red, ability, first, second, fire } = setup(t);
  fire(1200, 600);
  room["updateProjectiles"](1500);
  assert.deepEqual(first.replies[0], {
    type: MORTAR_IMPACT_MESSAGE,
    message: { shotId: (first.replies[0].message as { shotId: string }).shotId, team: "blue", x: 1200, y: 600, radius: 120 }
  });
  assert.equal(second.replies.length, 0);
  ability.cooldownEndsAt = 0;
  fire(1200, 600);
  red.x = 1200;
  room["updateProjectiles"](1500);
  assert.equal(second.replies.length, 1);
  assert.equal(second.replies[0].type, MORTAR_IMPACT_MESSAGE);
  assert.deepEqual(second.replies[0].message, first.replies.at(-1)!.message);
});

test("blind blast damage never adds a hidden enemy to the firing team's view or sight", (t) => {
  const { room, blue, red, fire } = setup(t);
  const view = new GameState();
  fire();
  updateClientView(view, room.state, blue.id, room["teamVision"]("blue"));
  assert.equal(view.tanks.has(red.id), false);
  room["updateProjectiles"](1500);
  updateClientView(view, room.state, blue.id, room["teamVision"]("blue"));
  assert.equal(red.hp, 76);
  assert.equal(view.tanks.has(red.id), false);
  assert.equal(room["teamVision"]("blue").canSee(red), false);
});
