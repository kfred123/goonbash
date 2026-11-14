import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { Base, Minion, Tank, Tower } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

function setup(t: TestContext) {
  const lobby = lobbyRegistry.create("Healer aura test");
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.clock.stop();
  room.state.bases.clear();
  const healer = Object.assign(new Tank(), {
    id: "healer", team: "blue", role: "healer", x: 1000, y: 900, hp: 40
  });
  Object.assign(healer.abilities.get("healer-aura")!, { level: 1, activeUntil: 2000 });
  room.state.tanks.set(healer.id, healer);
  t.after(() => {
    room.onDispose();
    room.clock.clear();
    lobbyRegistry.leave(lobby.id);
  });
  return { room, healer };
}

test("active aura heals living allied minions at the same rate as tanks, up to max HP", (t) => {
  const { room, healer } = setup(t);
  const tank = Object.assign(new Tank(), { id: "ally", team: "blue", x: 1072, y: 996, hp: 10 });
  const minion = Object.assign(new Minion(), { id: "minion", team: "blue", x: 1072, y: 996, hp: 10 });
  const nearMax = Object.assign(new Minion(), { id: "capped", team: "blue", x: 1000, y: 900, hp: 49 });
  room.state.tanks.set(tank.id, tank);
  room.state.minions.set(minion.id, minion);
  room.state.minions.set(nearMax.id, nearMax);
  room["resolveHealerAuras"](0.5, 1000);
  assert.equal(healer.hp, 44);
  assert.equal(tank.hp, 14);
  assert.equal(minion.hp, 14);
  assert.equal(nearMax.hp, 50);
  healer.abilities.get("healer-aura")!.level = 10;
  room["resolveHealerAuras"](1, 1000);
  assert.equal(minion.hp, 29.2);
  assert.equal(tank.hp, 29.2);
});

test("aura excludes enemy, dead, out-of-range minions and structures and stops on expiry or caster death", (t) => {
  const { room, healer } = setup(t);
  const valid = Object.assign(new Minion(), { id: "valid", team: "blue", x: 1100, y: 900, hp: 10 });
  const enemy = Object.assign(new Minion(), { id: "enemy", team: "red", x: 1100, y: 900, hp: 10 });
  const dead = Object.assign(new Minion(), { id: "dead", team: "blue", x: 1100, y: 900, hp: 0 });
  const distant = Object.assign(new Minion(), { id: "distant", team: "blue", x: 1120.01, y: 900, hp: 10 });
  for (const minion of [valid, enemy, dead, distant]) room.state.minions.set(minion.id, minion);
  const tower = Object.assign(new Tower(), { id: "tower", team: "blue", x: 1000, y: 900, hp: 10 });
  const base = Object.assign(new Base(), { id: "base", team: "blue", x: 1000, y: 900, hp: 10 });
  room.state.towers.set(tower.id, tower);
  room.state.bases.set(base.id, base);
  room["resolveHealerAuras"](1, 1000);
  assert.deepEqual([valid.hp, enemy.hp, dead.hp, distant.hp, tower.hp, base.hp], [18, 10, 0, 10, 10, 10]);
  room["resolveHealerAuras"](1, 2000);
  assert.equal(valid.hp, 18);
  healer.state = "dead";
  room["resolveHealerAuras"](1, 1000);
  assert.equal(valid.hp, 18);
});
