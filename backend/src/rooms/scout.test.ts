import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test, type TestContext } from "node:test";
import type { Client } from "colyseus";
import { computeAbilityConfigForLevel, resolveRoleStats, Tank } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

test("Scout abilities work together in a started match without disabling enemy fire", (t: TestContext) => {
  const lobby = lobbyRegistry.create("Scout integration test");
  const room = new GameRoom();
  room.autoDispose = false;
  room.setPatchRate(null);
  room.setMetadata = async () => {};
  room.onCreate({ lobbyId: lobby.id });
  room.setSimulationInterval();
  room.clock.stop();
  room.state.phase = "started";
  room.state.bases.clear();

  const scout = Object.assign(new Tank(), resolveRoleStats("scout"), {
    id: "scout", team: "blue", role: "scout", x: 1200, y: 900, fireRange: 0
  });
  const enemy = Object.assign(new Tank(), resolveRoleStats("tank"), {
    id: "enemy", team: "red", role: "tank", x: 1600, y: 900, fireRange: 300
  });
  room.state.tanks.set(scout.id, scout);
  room.state.tanks.set(enemy.id, enemy);

  const makeClient = (id: string): Client => {
    const unexpected = () => { throw new Error("Unexpected transport action"); };
    return {
      id, sessionId: id, state: 1, readyState: 1, ref: new EventEmitter(),
      _reconnectionToken: "", _afterNextPatchQueue: [],
      send: unexpected, raw: unexpected, sendBytes: unexpected, enqueueRaw: unexpected,
      leave: unexpected, close: unexpected, error: unexpected
    };
  };
  const scoutClient = makeClient(scout.id);
  room.clients.push(scoutClient, makeClient(enemy.id));
  const activate = (abilityId: string, targetId?: string) =>
    room["onMessageHandlers"].activate_ability(scoutClient, { abilityId, targetId });

  t.after(() => {
    room.onDispose();
    room.clock.clear();
    lobbyRegistry.leave(lobby.id);
  });

  assert.equal(room["teamVision"]("blue").canSee(enemy), false);
  const baseSight = scout.sightRange;
  const visionAbility = scout.abilities.get("scout-weitsicht")!;
  visionAbility.level = 1;
  activate("scout-weitsicht");
  assert.equal(scout.sightRange, baseSight + computeAbilityConfigForLevel("scout-weitsicht", 1).magnitude);
  assert.equal(room["teamVision"]("blue").canSee(enemy), true);

  const offroadAbility = scout.abilities.get("scout-offroad")!;
  offroadAbility.level = 1;
  scout.x = 1200;
  scout.y = 700;
  scout.moveTargetX = 1300;
  scout.moveTargetY = 700;
  scout.hasMoveTarget = true;
  activate("scout-offroad");
  room["updateTankMovement"](1);
  assert.equal(scout.x, 1260);

  scout.x = 1200;
  scout.y = 900;
  scout.hasMoveTarget = false;
  enemy.x = 1350;
  enemy.y = 900;
  const shockAbility = scout.abilities.get("scout-shockshot")!;
  shockAbility.level = 1;
  const enemyHp = enemy.hp;
  activate("scout-shockshot", enemy.id);
  assert.equal(room.state.projectiles.size, 1);
  room["updateProjectiles"](1000);
  assert.equal(room.state.projectiles.size, 0);
  assert.equal(enemy.hp, enemyHp);
  assert.ok(enemy.movementDisabledUntil > Date.now());

  enemy.moveTargetX = 1450;
  enemy.moveTargetY = 900;
  enemy.hasMoveTarget = true;
  const enemyX = enemy.x;
  room.update(100);
  assert.equal(enemy.x, enemyX);
  assert.equal(enemy.targetId, scout.id);
  assert.ok(enemy.fireCooldown > 0);
});
