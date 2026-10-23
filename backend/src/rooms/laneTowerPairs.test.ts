import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, TestContext } from "node:test";
import type { Client } from "colyseus";
import {
  ARENA_VISION_TERRAIN, BLUE_BASE_POSITION, RED_BASE_POSITION, Minion, Tower, TOWER_COLLISION_RADIUS
} from "shared";
import { GameRoom } from "./GameRoom.js";
import { getLaneTowerPlacements } from "./towerPlacement.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

function startMatch(t: TestContext) {
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  const lobby = lobbyRegistry.create("Roadside tower test");
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  t.after(() => {
    room.clock.stop();
    room.clock.clear();
    room.setSimulationInterval();
    room.onDispose();
    lobbyRegistry.leave(lobby.id);
  });
  const unexpected = () => { throw new Error("Unexpected transport action in tower test"); };
  const client: Client = {
    sessionId: "host", id: "host", readyState: 1, state: 1, ref: new EventEmitter(),
    _reconnectionToken: "", _afterNextPatchQueue: [],
    send: unexpected, sendBytes: unexpected, raw: unexpected, enqueueRaw: unexpected,
    leave: unexpected, close: unexpected, error: unexpected
  };
  room.state.hostSessionId = client.sessionId;
  room["onMessageHandlers"].start_game(client);
  assert.equal(room.state.phase, "started");
  return room;
}

test("starting a match creates 24 uniquely identified normal towers at their grass placements", (t) => {
  const room = startMatch(t);
  const placements = getLaneTowerPlacements(BLUE_BASE_POSITION, RED_BASE_POSITION);
  assert.equal(room.state.towers.size, 24);
  assert.equal(new Set([...room.state.towers.values()].map(tower => tower.id)).size, 24);
  const defaults = new Tower();
  for (const placement of placements) {
    const id = `${placement.team}-tower-lane-${placement.laneIndex}-${placement.towerIndex}-${placement.side}`;
    const tower = room.state.towers.get(id);
    assert.ok(tower);
    assert.equal(tower.team, placement.team);
    assert.equal(tower.x, placement.x);
    assert.equal(tower.y, placement.y);
    assert.equal(tower.radius, TOWER_COLLISION_RADIUS);
    assert.ok(ARENA_VISION_TERRAIN.isGrass(tower));
    for (const key of ["hp", "maxHp", "fireRange", "fireDamage", "sightRange", "fireCooldown", "fireCooldownMax"] as const) {
      assert.equal(tower[key], defaults[key], key);
    }
  }
});

test("paired towers retain separate cooldowns, health, shots, targets and ruins", (t) => {
  const room = startMatch(t);
  const left = room.state.towers.get("blue-tower-lane-1-0-left")!;
  const right = room.state.towers.get("blue-tower-lane-1-0-right")!;
  room.state.bases.clear();
  room.state.towers.clear();
  room.state.towers.set(left.id, left);
  room.state.towers.set(right.id, right);
  for (const tower of [left, right]) {
    const enemy = Object.assign(new Minion(), {
      id: `${tower.id}-enemy`, team: "red", x: tower.x + 20, y: tower.y, fireRange: 0
    });
    room.state.minions.set(enemy.id, enemy);
  }
  left.fireCooldown = 600;
  room["resolveCombat"](0);
  assert.equal(left.shotCount, 0);
  assert.equal(left.fireCooldown, 600);
  assert.equal(right.shotCount, 1);
  assert.equal(right.fireCooldown, right.fireCooldownMax);
  assert.equal(right.targetId, `${right.id}-enemy`);

  left.fireCooldown = 0;
  room["resolveCombat"](0);
  assert.equal(left.shotCount, 1);
  assert.equal(right.shotCount, 1);
  room["applyDamage"](left, 40);
  assert.equal(left.hp, 260);
  assert.equal(right.hp, 300);
  const ruinPosition = { x: left.x, y: left.y };
  room["applyDamage"](left, left.hp);
  assert.equal(left.hp, 0);
  assert.equal(left.targetId, "");
  assert.equal(room.state.towers.get(left.id), left);
  assert.deepEqual({ x: left.x, y: left.y }, ruinPosition);
  right.fireCooldown = 0;
  room["resolveCombat"](0);
  assert.equal(left.shotCount, 1);
  assert.equal(right.shotCount, 2);
  assert.equal(right.hp, 300);
});

test("roadside towers keep grass vision penalties and can use allied spotting without extending fire range", (t) => {
  const room = startMatch(t);
  const tower = room.state.towers.get("blue-tower-lane-1-0-left")!;
  room.state.bases.clear();
  room.state.towers.clear();
  room.state.towers.set(tower.id, tower);
  const enemy = Object.assign(new Minion(), {
    id: "enemy", team: "red", x: tower.x + 100, y: tower.y, fireRange: 0
  });
  room.state.minions.set(enemy.id, enemy);
  assert.equal(room["teamVision"]("blue").canSee(enemy), false);
  room["resolveCombat"](0);
  assert.equal(tower.shotCount, 0);
  const scout = Object.assign(new Minion(), {
    id: "scout", team: "blue", x: enemy.x, y: enemy.y, fireRange: 0
  });
  room.state.minions.set(scout.id, scout);
  room["resolveCombat"](0);
  assert.equal(tower.shotCount, 1);
  assert.equal(tower.targetId, enemy.id);
  enemy.x = tower.x + tower.fireRange + 1;
  scout.x = enemy.x;
  tower.fireCooldown = 0;
  room["resolveCombat"](0);
  assert.equal(tower.shotCount, 1);
  assert.equal(tower.targetId, "");
  room.state.minions.delete(scout.id);
  enemy.x = tower.x + 20;
  assert.equal(room["teamVision"]("blue").canSee(enemy), true);
  room["resolveCombat"](0);
  assert.equal(tower.shotCount, 2);
});
