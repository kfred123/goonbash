import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Server } from "colyseus";
import type { Client as ServerClient } from "colyseus";
import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";
import { GameState, INVALID_TARGET_MESSAGE, MORTAR_IMPACT_MESSAGE, Tower } from "shared";
import type { InvalidTargetMessage, MortarImpactMessage } from "shared";
import { GameRoom } from "./GameRoom.js";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";

async function until(predicate: () => boolean, description: string) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `Timeout: ${description}`);
    await setTimeout(10);
  }
}

class MortarFixtureRoom extends GameRoom {
  onCreate(options: { lobbyId: string }) {
    super.onCreate(options);
    this.setSimulationInterval();
    this.state.bases.clear();
    this.state.towers.set("siege-tower", Object.assign(new Tower(), { id: "siege-tower", team: "red", x: 1500, y: 600 }));
    this.onMessage("fixture", (client, action: string) => {
      const blue = this.state.tanks.get(client.sessionId);
      if (blue?.team !== "blue") throw new Error("Only the blue fixture driver may advance the simulation");
      if (action === "begin") this.state.phase = "started";
      else if (action === "almost-impact") this["updateProjectiles"](1499);
      else if (action === "impact") this["updateProjectiles"](1);
      else if (action === "reset-cooldown") blue.abilities.get("damagedealer-mortar")!.cooldownEndsAt = 0;
      else if (action === "dodge") {
        for (const tank of this.state.tanks.values()) if (tank.team === "red") tank.x = 1700;
      } else if (action === "finish") {
        this.state.phase = "ended";
        this.update(1500);
      } else throw new Error(`Unknown fixture action ${action}`);
    });
  }

  onJoin(client: ServerClient, options: { lobbyId: string }) {
    super.onJoin(client, options);
    const tank = this.state.tanks.get(client.sessionId)!;
    const team = this.clients.length === 1 ? "blue" : "red";
    tank.team = team;
    tank.role = "damagedealer";
    tank.x = tank.team === "blue" ? 1000 : 1500;
    tank.y = 600;
    tank.hp = tank.maxHp = 100;
    tank.fireDamage = 12;
    tank.skillPoints = 2;
    this.state.playerStats.get(client.sessionId)!.team = team;
  }
}

test("two live clients learn independent skills and observe delayed blind siege damage without hidden entity revelation", async (t) => {
  const lobby = lobbyRegistry.create("Mortar socket acceptance");
  const http = createServer();
  const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
  server.define("mortar_fixture", MortarFixtureRoom);
  const rooms: Array<Room<GameState>> = [];
  t.after(async () => {
    await Promise.all(rooms.map(room => room.leave()));
    await server.gracefullyShutdown(false);
  });
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const client = new Client(`ws://127.0.0.1:${address.port}`);
  const blue = await client.create<GameState>("mortar_fixture", { lobbyId: lobby.id });
  rooms.push(blue);
  const red = await client.joinById<GameState>(blue.id, { lobbyId: lobby.id });
  rooms.push(red);
  const impacts: MortarImpactMessage[] = [];
  const rejections: InvalidTargetMessage[] = [];
  const opposingImpacts: MortarImpactMessage[] = [];
  blue.onMessage(MORTAR_IMPACT_MESSAGE, message => impacts.push(message));
  red.onMessage(MORTAR_IMPACT_MESSAGE, message => opposingImpacts.push(message));
  blue.onMessage(INVALID_TARGET_MESSAGE, message => rejections.push(message));
  await until(() => blue.state.tanks.size === 2, "lobby roster");
  blue.send("fixture", "begin");
  await until(() => blue.state.phase === "started" && red.state.phase === "started", "active projections");
  const mortar = () => blue.state.tanks.get(blue.sessionId)!.abilities.get("damagedealer-mortar")!;
  assert.equal(mortar().level, 0);
  blue.send("upgrade_ability", { abilityId: "damagedealer-mortar" });
  blue.send("upgrade_ability", { abilityId: "damagedealer-homing-rocket" });
  await until(() => mortar().level === 1 && blue.state.tanks.get(blue.sessionId)!.skillPoints === 0, "independent purchases");
  assert.equal(blue.state.tanks.has(red.sessionId), false);
  assert.equal(blue.state.towers.size, 0);
  const towerHp = red.state.towers.get("siege-tower")!.hp;
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 1500, targetY: 600 });
  await until(() => blue.state.projectiles.size === 1 && mortar().cooldownMax === 24000, "authoritative launch");
  assert.equal(blue.state.tanks.get(blue.sessionId)!.abilities.get("damagedealer-homing-rocket")!.cooldownEndsAt, 0);
  blue.send("fixture", "almost-impact");
  await until(() => [...blue.state.projectiles.values()][0]?.flightProgress > 0.99, "pre-impact flight");
  assert.equal(red.state.tanks.get(red.sessionId)!.hp, 100);
  assert.equal(impacts.length, 0);
  blue.send("fixture", "impact");
  await until(() => impacts.length === 1 && red.state.tanks.get(red.sessionId)!.hp === 76, "blind damage");
  await until(() => red.state.towers.get("siege-tower")!.hp === towerHp - 72, "triple structure damage");
  assert.equal(opposingImpacts.length, 1);
  assert.equal(blue.state.tanks.has(red.sessionId), false);
  assert.equal(blue.state.towers.size, 0);
  assert.deepEqual(Object.keys(impacts[0]).sort(), ["radius", "shotId", "team", "x", "y"]);
  const priorCooldown = mortar().cooldownEndsAt;
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 1500, targetY: 600 });
  await until(() => rejections.length === 1, "cooldown feedback");
  assert.deepEqual(rejections[0], { action: "mortar", reason: "cooldown" });
  assert.equal(mortar().cooldownEndsAt, priorCooldown);
  blue.send("fixture", "reset-cooldown");
  await until(() => mortar().cooldownEndsAt === 0, "fixture cooldown reset");
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 1500, targetY: 600 });
  blue.send("fixture", "dodge");
  blue.send("fixture", "almost-impact");
  blue.send("fixture", "impact");
  await until(() => impacts.length === 2 && red.state.towers.get("siege-tower")!.hp === towerHp - 144, "dodged second shot");
  assert.equal(red.state.tanks.get(red.sessionId)!.hp, 76);
  assert.equal(opposingImpacts.length, 2, "the surviving tower still supplies team vision of its impact point");
  blue.send("fixture", "reset-cooldown");
  await until(() => mortar().cooldownEndsAt === 0, "second reset");
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 2000, targetY: 600 });
  await until(() => rejections.length === 2, "out-of-range feedback");
  assert.deepEqual(rejections[1], { action: "mortar", reason: "out_of_range" });
  assert.equal(mortar().cooldownEndsAt, 0);
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 1200, targetY: 600 });
  blue.send("fixture", "almost-impact");
  blue.send("fixture", "impact");
  await until(() => impacts.length === 3, "empty blind shot");
  assert.equal(opposingImpacts.length, 2, "opponents receive no impact where no allied observer has sight");
  blue.send("fixture", "reset-cooldown");
  await until(() => mortar().cooldownEndsAt === 0, "final reset");
  blue.send("activate_ability", { abilityId: "damagedealer-mortar", targetX: 1500, targetY: 600 });
  await until(() => blue.state.projectiles.size === 1, "final pending shell");
  blue.send("fixture", "finish");
  await until(() => blue.state.phase === "ended" && blue.state.projectiles.size === 0, "match-end cleanup");
  assert.equal(impacts.length, 3);
});
