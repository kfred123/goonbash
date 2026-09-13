import { Room, Client } from "colyseus";
import { Base, GameState, Minion, Projectile, Tank } from "shared";
import { lobbyRegistry } from "../index.js";
import { canChangeTeam, canManageLobby, normalizeLobbyName, normalizePlayerName, resolveHostAfterLeave, selectBalancedTeam } from "./lobbyControls.js";
import { findNearestEnemyInRange, hasDied, hasProjectileReachedTarget, isReadyToRespawn, applyDamage as computeDamagedHp, respawnTank } from "./combat.js";

const RESPAWN_DELAY_MS = 3000;
const PROJECTILE_HIT_RADIUS = 12;
const PROJECTILE_MAX_LIFETIME_MS = 3000;

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private spawnTimer = 0;
  private projectileLifetimes = new Map<string, number>();

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
      if (!tank || this.state.phase !== "started" || tank.state === "dead") return;
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
    const now = Date.now();
    this.state.tanks.forEach((tank) => {
      if (tank.state === "dead") return;
      const length = Math.hypot(tank.inputX, tank.inputY) || 1;
      const speed = 180 * elapsedSeconds;
      tank.x = Math.max(20, Math.min(780, tank.x + tank.inputX / length * speed));
      tank.y = Math.max(20, Math.min(580, tank.y + tank.inputY / length * speed));
    });

    // Resolve targeting/firing before movement so minions that are engaged
    // with an enemy this tick hold their ground instead of marching through it.
    this.resolveCombat(deltaTime);
    this.resolveRespawns(now);

    this.state.minions.forEach((minion) => {
      if (minion.targetId) return;
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

  /** Assigns automatic targets, fires cooled-down units, and advances/resolves projectiles. */
  private resolveCombat(deltaTime: number) {
    const aliveTanks = [...this.state.tanks.values()].filter((tank) => tank.state !== "dead");
    const minions = [...this.state.minions.values()];
    const enemyCandidates: Array<Tank | Minion> = [...aliveTanks, ...minions];

    for (const tank of aliveTanks) this.updateShooter(tank, enemyCandidates, deltaTime);
    for (const minion of minions) this.updateShooter(minion, enemyCandidates, deltaTime);

    this.updateProjectiles(deltaTime);
  }

  /** Acquires the nearest enemy target (ignoring all friendly units) and fires when ready. */
  private updateShooter(unit: Tank | Minion, enemyCandidates: Array<Tank | Minion>, deltaTime: number) {
    const target = findNearestEnemyInRange(unit, enemyCandidates, unit.fireRange);
    unit.targetId = target?.id ?? "";
    if (unit.fireCooldown > 0) unit.fireCooldown = Math.max(0, unit.fireCooldown - deltaTime);
    if (target && unit.fireCooldown <= 0) {
      this.spawnProjectile(unit, target);
      unit.fireCooldown = unit.fireCooldownMax;
    }
  }

  private spawnProjectile(shooter: Tank | Minion, target: { id: string }) {
    const projectile = new Projectile();
    projectile.id = `shot-${Date.now()}-${Math.random()}`;
    projectile.team = shooter.team;
    projectile.ownerId = shooter.id;
    projectile.targetId = target.id;
    projectile.x = shooter.x;
    projectile.y = shooter.y;
    projectile.damage = shooter.fireDamage;
    this.state.projectiles.set(projectile.id, projectile);
    this.projectileLifetimes.set(projectile.id, 0);
  }

  /** Moves every in-flight projectile toward its target, applies damage on impact, and cleans up. */
  private updateProjectiles(deltaTime: number) {
    const elapsedSeconds = deltaTime / 1000;
    const toRemove: string[] = [];

    this.state.projectiles.forEach((projectile) => {
      const target = this.findLivingEntity(projectile.targetId);
      if (!target) {
        toRemove.push(projectile.id);
        return;
      }

      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy) || 1;
      projectile.x += (dx / distance) * projectile.speed * elapsedSeconds;
      projectile.y += (dy / distance) * projectile.speed * elapsedSeconds;

      if (hasProjectileReachedTarget(projectile.x, projectile.y, target.x, target.y, PROJECTILE_HIT_RADIUS)) {
        this.applyDamage(target, projectile.damage);
        toRemove.push(projectile.id);
        return;
      }

      const lifetime = (this.projectileLifetimes.get(projectile.id) ?? 0) + deltaTime;
      this.projectileLifetimes.set(projectile.id, lifetime);
      if (lifetime >= PROJECTILE_MAX_LIFETIME_MS) toRemove.push(projectile.id);
    });

    for (const id of toRemove) {
      this.state.projectiles.delete(id);
      this.projectileLifetimes.delete(id);
    }
  }

  /** Looks up a still-alive tank or minion by id (dead tanks are not valid projectile targets). */
  private findLivingEntity(id: string): Tank | Minion | undefined {
    const tank = this.state.tanks.get(id);
    if (tank) return tank.state === "dead" ? undefined : tank;
    return this.state.minions.get(id);
  }

  private applyDamage(entity: Tank | Minion, damage: number) {
    entity.hp = computeDamagedHp(entity.hp, damage);
    if (!hasDied(entity.hp)) return;
    if (entity instanceof Tank) {
      this.killTank(entity);
    } else {
      this.state.minions.delete(entity.id);
    }
  }

  private killTank(tank: Tank) {
    tank.state = "dead";
    tank.targetId = "";
    tank.inputX = 0;
    tank.inputY = 0;
    tank.respawnAt = Date.now() + RESPAWN_DELAY_MS;
  }

  /** Restores a dead tank to full HP at its team's base once its respawn delay has elapsed. */
  private resolveRespawns(now: number) {
    this.state.tanks.forEach((tank) => {
      if (!isReadyToRespawn(tank, now)) return;
      const base = this.state.bases.get(`${tank.team}-base`);
      const respawned = respawnTank(tank.maxHp, base?.x ?? tank.x, base?.y ?? tank.y);
      tank.hp = respawned.hp;
      tank.x = respawned.x;
      tank.y = respawned.y;
      tank.state = respawned.state;
      tank.respawnAt = respawned.respawnAt;
    });
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
