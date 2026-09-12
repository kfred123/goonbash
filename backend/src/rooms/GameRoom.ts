import { Room, Client } from "colyseus";
import { Base, GameState, Minion, Tank } from "shared";
import { lobbyRegistry } from "../index.js";
import { canChangeTeam, canManageLobby, normalizeLobbyName, selectBalancedTeam } from "./lobbyControls.js";

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private spawnTimer = 0;

  onCreate (options: any) {
    console.log("GameRoom created!", options);
    this.setMetadata({ lobbyId: options.lobbyId });
    const lobby = lobbyRegistry.get(options.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    const state = new GameState();
    state.lobbyName = lobby.name;
    this.setState(state);
    this.createBase("blue", 80, 300);
    this.createBase("red", 720, 300);
    this.onMessage("input", (client, input: { x?: number; y?: number }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || this.state.phase !== "started") return;
      tank.inputX = Math.max(-1, Math.min(1, Number(input?.x) || 0));
      tank.inputY = Math.max(-1, Math.min(1, Number(input?.y) || 0));
    });
    this.onMessage("change_team", (client, team: unknown) => {
      if (!canChangeTeam(this.state.phase, team)) return;
      const tank = this.state.tanks.get(client.sessionId);
      if (tank) tank.team = team;
    });
    this.onMessage("rename_lobby", (client, name: unknown) => {
      if (!canManageLobby(this.state.phase, client.sessionId, this.state.hostSessionId)) return;
      const trimmedName = normalizeLobbyName(name);
      if (!trimmedName) return;
      const lobbyId = this.metadata.lobbyId;
      lobbyRegistry.rename(lobbyId, trimmedName);
      this.state.lobbyName = trimmedName;
    });
    this.onMessage("start_game", (client) => {
      if (!canManageLobby(this.state.phase, client.sessionId, this.state.hostSessionId)) return;
      this.state.phase = "started";
    });

    // Fixed time-step game loop (60 FPS)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);
  }

  update(deltaTime: number) {
    if (this.state.phase !== "started") return;
    const elapsedSeconds = deltaTime / 1000;
    this.state.tanks.forEach((tank) => {
      const length = Math.hypot(tank.inputX, tank.inputY) || 1;
      const speed = 180 * elapsedSeconds;
      tank.x = Math.max(20, Math.min(780, tank.x + tank.inputX / length * speed));
      tank.y = Math.max(20, Math.min(580, tank.y + tank.inputY / length * speed));
    });

    this.state.minions.forEach((minion) => {
      const dx = minion.waypointX - minion.x;
      const dy = minion.waypointY - minion.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) {
        minion.x += dx / distance * minion.speed * elapsedSeconds;
        minion.y += dy / distance * minion.speed * elapsedSeconds;
      }
    });

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = 5000;
    }
  }

  private createBase(team: string, x: number, y: number) {
    const base = new Base();
    base.id = `${team}-base`;
    base.team = team;
    base.x = x;
    base.y = y;
    this.state.bases.set(base.id, base);
  }

  private spawnWave() {
    const blueBase = this.state.bases.get("blue-base");
    const redBase = this.state.bases.get("red-base");
    if (!blueBase || !redBase) return;
    for (const base of [blueBase, redBase]) {
      const minion = new Minion();
      minion.id = `${base.team}-minion-${Date.now()}-${Math.random()}`;
      minion.team = base.team;
      minion.x = base.x;
      minion.y = base.y;
      minion.waypointX = base.team === "blue" ? redBase.x : blueBase.x;
      minion.waypointY = base.y;
      this.state.minions.set(minion.id, minion);
    }
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    lobbyRegistry.join(options.lobbyId);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    const tank = new Tank();
    tank.id = client.sessionId;
    tank.team = this.nextTeam();
    tank.x = Math.random() * 500;
    tank.y = Math.random() * 500;
    this.state.tanks.set(client.sessionId, tank);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.tanks.delete(client.sessionId);
    lobbyRegistry.leave(this.metadata.lobbyId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private nextTeam(): "red" | "blue" {
    return selectBalancedTeam(this.state.tanks.values());
  }
}
