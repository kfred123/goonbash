import { Room, Client } from "colyseus";
import { Base, GameState, Minion, Tank } from "shared";
import { lobbyRegistry } from "../index.js";

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private spawnTimer = 0;

  onCreate (options: any) {
    console.log("GameRoom created!", options);
    this.setMetadata({ lobbyId: options.lobbyId });
    this.setState(new GameState());
    this.createBase("blue", 80, 300);
    this.createBase("red", 720, 300);

    // Fixed time-step game loop (60 FPS)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);
  }

  update(deltaTime: number) {
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
    const tank = new Tank();
    tank.id = client.sessionId;
    tank.x = Math.random() * 500;
    tank.y = Math.random() * 500;
    this.state.tanks.set(client.sessionId, tank);
    this.onMessage("input", (inputClient, input: { x?: number; y?: number }) => {
      if (inputClient.sessionId !== client.sessionId) return;
      tank.inputX = Math.max(-1, Math.min(1, Number(input?.x) || 0));
      tank.inputY = Math.max(-1, Math.min(1, Number(input?.y) || 0));
    });
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.tanks.delete(client.sessionId);
    lobbyRegistry.leave(this.metadata.lobbyId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
