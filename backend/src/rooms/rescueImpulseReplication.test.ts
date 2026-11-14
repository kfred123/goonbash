import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { Server } from "colyseus";
import type { Client as ServerClient } from "colyseus";
import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";
import { GameState, INVALID_TARGET_MESSAGE, Minion } from "shared";
import type { InvalidTargetMessage } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { GameRoom } from "./GameRoom.js";

async function until(predicate: () => boolean, description: string) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `Timeout: ${description}`);
    await setTimeout(10);
  }
}

class RescueFixtureRoom extends GameRoom {
  onCreate(options: { lobbyId: string }) {
    super.onCreate(options);
    this.setSimulationInterval();
    this.onMessage("fixture", (client, action: string) => {
      const tank = this.state.tanks.get(client.sessionId)!;
      if (action === "probe") {
        client.send("fixture_done", action);
        return;
      }
      if (tank.role !== "healer") throw new Error("Only the Healer fixture driver may change the match");
      if (action === "begin") {
        this.state.phase = "started";
        this.state.bases.clear();
        this.state.minions.set("allied-minion", Object.assign(new Minion(), {
          id: "allied-minion", team: "blue", x: 1100, y: 1000, hp: 10, maxHp: 50
        }));
      } else if (action === "reset-cooldown") {
        tank.abilities.get("healer-rescue-impulse")!.cooldownEndsAt = 0;
      } else throw new Error(`Unknown fixture action ${action}`);
    });
  }

  onJoin(client: ServerClient, options: { lobbyId: string }) {
    super.onJoin(client, options);
    const tank = this.state.tanks.get(client.sessionId)!;
    const healer = this.clients.length === 1;
    Object.assign(tank, {
      team: "blue", role: healer ? "healer" : "tank",
      x: healer ? 1000 : 1100, y: 900, hp: healer ? 40 : 150,
      maxHp: healer ? 90 : 170, skillPoints: 2, fireRange: 0
    });
    this.state.playerStats.get(client.sessionId)!.team = "blue";
  }
}

test("two live clients replicate Rescue Impulse healing for tanks and minions", async (t) => {
  const lobby = lobbyRegistry.create("Rescue Impulse socket acceptance");
  const http = createServer();
  const server = new Server({ server: http, greet: false, gracefullyShutdown: false });
  server.define("rescue_fixture", RescueFixtureRoom);
  const rooms: Array<Room<GameState>> = [];
  t.after(async () => {
    await Promise.all(rooms.map(room => room.leave()));
    await server.gracefullyShutdown(false);
  });
  await server.listen(0, "127.0.0.1");
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const client = new Client(`ws://127.0.0.1:${address.port}`);
  const healer = await client.create<GameState>("rescue_fixture", { lobbyId: lobby.id });
  rooms.push(healer);
  const ally = await client.joinById<GameState>(healer.id, { lobbyId: lobby.id });
  rooms.push(ally);
  const rejections: InvalidTargetMessage[] = [];
  healer.onMessage(INVALID_TARGET_MESSAGE, message => rejections.push(message));
  let probes = 0;
  ally.onMessage("fixture_done", () => { probes++; });
  await until(() => healer.state.tanks.size === 2, "allied roster");
  healer.send("fixture", "begin");
  await until(() => healer.state.phase === "started" && ally.state.phase === "started", "started state");
  const local = () => healer.state.tanks.get(healer.sessionId)!;
  const rescue = () => local().abilities.get("healer-rescue-impulse")!;
  assert.equal(rescue().level, 0);
  healer.send("upgrade_ability", { abilityId: "healer-rescue-impulse" });
  await until(() => rescue().level === 1 && local().skillPoints === 1, "learned third skill");
  assert.equal(local().abilities.get("healer-aura")!.level, 0);
  assert.equal(local().abilities.get("healer-speed")!.level, 0);
  ally.send("upgrade_ability", { abilityId: "healer-rescue-impulse" });
  ally.send("fixture", "probe");
  await until(() => probes === 1, "non-Healer purchase processed");
  assert.equal(ally.state.tanks.get(ally.sessionId)!.abilities.get("healer-rescue-impulse")!.level, 0);
  assert.equal(ally.state.tanks.get(ally.sessionId)!.skillPoints, 2);
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: ally.sessionId });
  await until(() => ally.state.tanks.get(ally.sessionId)!.hp === 168 && rescue().cooldownMax === 20000,
    "ally HP and private cooldown replication");
  await until(() => healer.state.tanks.get(ally.sessionId)!.hp === 168, "healer view of allied HP");
  assert.equal(local().hp, 40);
  assert.equal(rescue().activeUntil, 0);
  const deadline = rescue().cooldownEndsAt;
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: ally.sessionId });
  await until(() => rejections.length === 1, "cooldown feedback");
  assert.deepEqual(rejections[0], { action: "rescue", reason: "cooldown" });
  assert.equal(rescue().cooldownEndsAt, deadline);
  assert.equal(ally.state.tanks.get(ally.sessionId)!.hp, 168);
  healer.send("fixture", "reset-cooldown");
  await until(() => rescue().cooldownEndsAt === 0, "self-heal cooldown reset");
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: healer.sessionId });
  await until(() => local().hp === 58 && rescue().cooldownEndsAt > 0, "self-heal replication");
  healer.send("upgrade_ability", { abilityId: "healer-rescue-impulse" });
  await until(() => rescue().level === 2 && local().skillPoints === 0, "independent upgrade");
  healer.send("fixture", "reset-cooldown");
  await until(() => rescue().cooldownEndsAt === 0, "cap cooldown reset");
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: ally.sessionId });
  await until(() => ally.state.tanks.get(ally.sessionId)!.hp === 170 && rescue().cooldownMax === 19400,
    "progression maximum cap at rank two");
  healer.send("fixture", "reset-cooldown");
  await until(() => rescue().cooldownEndsAt === 0, "full-HP cooldown reset");
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: ally.sessionId });
  await until(() => rescue().cooldownEndsAt > 0, "full-HP activation commits cooldown");
  assert.equal(ally.state.tanks.get(ally.sessionId)!.hp, 170);
  healer.send("fixture", "reset-cooldown");
  await until(() => rescue().cooldownEndsAt === 0, "minion cooldown reset");
  healer.send("activate_ability", { abilityId: "healer-rescue-impulse", targetId: "allied-minion" });
  await until(() => healer.state.minions.get("allied-minion")?.hp === 31
    && ally.state.minions.get("allied-minion")?.hp === 31 && rescue().cooldownEndsAt > 0,
    "allied minion healing replicated to both clients");
  assert.equal(local().abilities.get("healer-aura")!.cooldownEndsAt, 0);
  assert.equal(local().abilities.get("healer-speed")!.cooldownEndsAt, 0);
});
