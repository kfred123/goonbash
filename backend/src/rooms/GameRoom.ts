import { Room, Client } from "colyseus";
import { CombatConfig, GameState, LANE_NAMES, Minion, Tank, Tower, buildLaneWaypoints, type LaneName } from "shared";
import { lobbyRegistry } from "../index.js";
import { canChangeTeam, canManageLobby, normalizeLobbyName, normalizePlayerName, resolveHostAfterLeave, selectBalancedTeam } from "./lobbyControls.js";
import { applyDamage, findNearestTarget, hasReachedWaypoint, shouldSpawnFromTower, stepToward } from "./combatLogic.js";

const OPPOSING_TEAM: Record<string, string> = { blue: "red", red: "blue" };

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
    this.createTower("blue", 80, 300);
    this.createTower("red", 720, 300);
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

    this.updateMinions(elapsedSeconds);

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = CombatConfig.spawnIntervalMs;
    }
  }

  private updateMinions(elapsedSeconds: number) {
    const deadMinionIds: string[] = [];

    this.state.minions.forEach((minion, id) => {
      const enemyTeam = OPPOSING_TEAM[minion.team];
      const enemies = this.collectEnemies(minion.team, enemyTeam);
      const target = findNearestTarget(minion, enemies, minion.attackRange);

      if (target) {
        minion.targetId = target.id;
        target.hp = applyDamage(target.hp, minion.damage, elapsedSeconds);
      } else {
        minion.targetId = "";
        this.advanceMinion(minion, enemyTeam, elapsedSeconds);
      }

      if (minion.hp <= 0) deadMinionIds.push(id);
    });

    deadMinionIds.forEach((id) => this.state.minions.delete(id));
  }

  /** Gathers all living enemy mobs, towers, and tanks that belong to `enemyTeam`. */
  private collectEnemies(ownTeam: string, enemyTeam: string) {
    const enemies: Array<{ id: string; x: number; y: number; team: string; hp: number }> = [];
    this.state.minions.forEach((minion) => {
      if (minion.team === enemyTeam) enemies.push(minion);
    });
    this.state.towers.forEach((tower) => {
      if (tower.team === enemyTeam) enemies.push(tower);
    });
    this.state.tanks.forEach((tank) => {
      if (tank.team === enemyTeam) enemies.push(tank);
    });
    return enemies;
  }

  private advanceMinion(minion: Minion, enemyTeam: string, elapsedSeconds: number) {
    const ownTower = this.state.towers.get(`${minion.team}-tower`);
    const enemyTower = this.state.towers.get(`${enemyTeam}-tower`);
    if (!ownTower || !enemyTower) return;

    const waypoints = buildLaneWaypoints(ownTower, enemyTower, minion.lane as LaneName);
    const waypoint = waypoints[Math.min(minion.waypointIndex, waypoints.length - 1)];
    const next = stepToward(minion, waypoint, minion.speed * elapsedSeconds);
    minion.x = next.x;
    minion.y = next.y;

    if (hasReachedWaypoint(minion, waypoint) && minion.waypointIndex < waypoints.length - 1) {
      minion.waypointIndex += 1;
    }
  }

  private createTower(team: string, x: number, y: number) {
    const tower = new Tower();
    tower.id = `${team}-tower`;
    tower.team = team;
    tower.x = x;
    tower.y = y;
    tower.hp = CombatConfig.tower.hp;
    tower.maxHp = CombatConfig.tower.maxHp;
    this.state.towers.set(tower.id, tower);
  }

  private spawnWave() {
    this.spawnWaveFor(this.state.towers.get("blue-tower"));
    this.spawnWaveFor(this.state.towers.get("red-tower"));
  }

  private spawnWaveFor(tower: Tower | undefined) {
    if (!tower || !shouldSpawnFromTower(tower)) return;
    for (const lane of LANE_NAMES) {
      const minion = new Minion();
      minion.id = `${tower.team}-minion-${lane}-${Date.now()}-${Math.random()}`;
      minion.team = tower.team;
      minion.x = tower.x;
      minion.y = tower.y;
      minion.lane = lane;
      minion.waypointIndex = 0;
      minion.hp = CombatConfig.mob.hp;
      minion.maxHp = CombatConfig.mob.maxHp;
      minion.speed = CombatConfig.mob.speed;
      minion.damage = CombatConfig.mob.damage;
      minion.attackRange = CombatConfig.mob.attackRange;
      this.state.minions.set(minion.id, minion);
    }
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    lobbyRegistry.join(options.lobbyId);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    const tank = new Tank();
    tank.id = client.sessionId;
    tank.name = normalizePlayerName(options?.playerName);
    tank.team = this.nextTeam();
    tank.x = Math.random() * 500;
    tank.y = Math.random() * 500;
    this.state.tanks.set(client.sessionId, tank);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.tanks.delete(client.sessionId);
    this.state.hostSessionId = resolveHostAfterLeave(
      client.sessionId,
      this.state.hostSessionId,
      this.state.tanks.keys()
    );
    lobbyRegistry.leave(this.metadata.lobbyId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private nextTeam(): "red" | "blue" {
    return selectBalancedTeam(this.state.tanks.values());
  }
}
