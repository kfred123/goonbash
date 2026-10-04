import { Room, Client } from "colyseus";
import { Base, GameState, getLaneWaypoints, Minion, Projectile, Tank, Tower } from "shared";
import { isRole, resolveRoleAbilityConfig, resolveRoleStats, ROLE_ABILITY_CONFIG } from "shared";
import { lobbyRegistry } from "../index.js";
import { canChangeRole, canChangeTeam, canManageLobby, normalizeLobbyName, normalizePlayerName, resolveHostAfterLeave, selectBalancedTeam } from "./lobbyControls.js";
import { clampToBounds, findNearestEnemyInRange, getLivingTowers, hasDied, hasProjectileReachedTarget, isReadyToRespawn, isWithinRange, stepToward, applyDamage as computeDamagedHp, nearBasePosition, respawnTank, tickShooter } from "./combat.js";
import { activateRoleAbility, applyShieldReduction, canActivateAbility, effectiveFireCooldown, healOverTick, isAbilityActive } from "./ability.js";
import { getLaneTowerPlacements } from "./towerPlacement.js";

const RESPAWN_DELAY_MS = 3000;
const PROJECTILE_HIT_RADIUS = 12;
const PROJECTILE_MAX_LIFETIME_MS = 3000;

// World is 3x the original 800x600 arena so the camera only shows part of the map at once.
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
const WORLD_MARGIN = 60;
const MIN_X = WORLD_MARGIN;
const MAX_X = WORLD_WIDTH - WORLD_MARGIN;
const MIN_Y = WORLD_MARGIN;
const MAX_Y = WORLD_HEIGHT - WORLD_MARGIN;
const WORLD_BOUNDS = { minX: MIN_X, maxX: MAX_X, minY: MIN_Y, maxY: MAX_Y };

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private spawnTimer = 0;
  private projectileLifetimes = new Map<string, number>();
  private minionPaths = new Map<string, Array<{ x: number; y: number }>>();

  onCreate (options: any) {
    console.log("GameRoom created!", options);
    this.setMetadata({ lobbyId: options.lobbyId });
    const lobby = lobbyRegistry.get(options.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    const state = new GameState();
    state.lobbyName = lobby.name;
    this.setState(state);
    this.createBase("blue", 240, 900);
    this.createBase("red", 2160, 900);
    this.onMessage("command", (client, command: { x?: unknown; y?: unknown; targetId?: unknown }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || this.state.phase !== "started" || tank.state === "dead") return;
      const targetId = typeof command?.targetId === "string" ? command.targetId : "";
      if (targetId) {
        const target = this.findLivingEntity(targetId);
        if (target && target.team !== tank.team) {
          tank.lockedTargetId = targetId;
          tank.hasMoveTarget = false;
          return;
        }
        // invalid/friendly targetId: fall through and try to treat it as a move-to-point instead
      }
      const x = typeof command?.x === "number" ? command.x : NaN;
      const y = typeof command?.y === "number" ? command.y : NaN
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const clamped = clampToBounds({ x, y }, MIN_X, MAX_X, MIN_Y, MAX_Y);
      tank.moveTargetX = clamped.x;
      tank.moveTargetY = clamped.y;
      tank.hasMoveTarget = true;
      tank.lockedTargetId = "";
    });
    this.onMessage("change_team", (client, team: unknown) => {
      if (!canChangeTeam(this.state.phase, team)) return;
      const tank = this.state.tanks.get(client.sessionId);
      if (tank) tank.team = team;
    });
    this.onMessage("select_role", (client, role: unknown) => {
      if (!canChangeRole(this.state.phase, role)) return;
      const tank = this.state.tanks.get(client.sessionId);
      if (tank) tank.role = role;
    });
    this.onMessage("activate_ability", (client) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || this.state.phase !== "started" || tank.state === "dead") return;
      const now = Date.now();
      if (!canActivateAbility(now, tank.abilityCooldownEndsAt)) return;
      const role = isRole(tank.role) ? tank.role : "tank";
      const timing = activateRoleAbility(role, now);
      tank.abilityCooldownEndsAt = timing.abilityCooldownEndsAt;
      tank.abilityCooldownMax = timing.abilityCooldownMax;
      tank.abilityActiveUntil = timing.abilityActiveUntil;
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
      this.state.tanks.forEach((tank) => this.applyRoleStats(tank));
      this.createLaneTowers();
      this.state.phase = "started";
    });

    // Fixed time-step game loop (60 FPS)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);
  }

  update(deltaTime: number) {
    if (this.state.phase !== "started") return;
    const elapsedSeconds = deltaTime / 1000;
    const now = Date.now();

    // Resolve targeting/firing before movement so units that are engaged
    // with an enemy this tick hold their ground instead of marching through it.
    this.resolveCombat(deltaTime);
    this.resolveRespawns(now);
    this.updateTankMovement(elapsedSeconds);
    this.resolveHealerAuras(elapsedSeconds, now);

    this.state.minions.forEach((minion) => {
      if (minion.targetId) return;
      const dx = minion.waypointX - minion.x;
      const dy = minion.waypointY - minion.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) {
        minion.x += dx / distance * minion.speed * elapsedSeconds;
        minion.y += dy / distance * minion.speed * elapsedSeconds;
      } else {
        const remainingPath = this.minionPaths.get(minion.id);
        const next = remainingPath?.shift();
        if (next) {
          minion.waypointX = next.x;
          minion.waypointY = next.y;
        }
      }
    });

    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = 5000;
    }
  }

  /**
   * Moves each alive player tank toward its locked attack target (when out of fire
   * range) or its commanded move-to-point destination, and leaves it standing still
   * once it arrives, has no destination, or is in range of its locked target (where
   * `updateLockedShooter` handles firing instead).
   */
  private updateTankMovement(elapsedSeconds: number) {
    this.state.tanks.forEach((tank) => {
      if (tank.state === "dead") return;
      const speed = tank.moveSpeed * elapsedSeconds;
      if (tank.lockedTargetId) {
        const target = this.findLivingEntity(tank.lockedTargetId);
        if (!target || isWithinRange(tank, target, tank.fireRange)) return;
        const next = stepToward(tank, target, speed);
        const clamped = clampToBounds(next, MIN_X, MAX_X, MIN_Y, MAX_Y);
        tank.x = clamped.x;
        tank.y = clamped.y;
        return;
      }
      if (!tank.hasMoveTarget) return;
      const next = stepToward(tank, { x: tank.moveTargetX, y: tank.moveTargetY }, speed);
      const clamped = clampToBounds(next, MIN_X, MAX_X, MIN_Y, MAX_Y);
      tank.x = clamped.x;
      tank.y = clamped.y;
      if (next.arrived) tank.hasMoveTarget = false;
    });
  }

  /** Assigns automatic targets, fires cooled-down units, and advances/resolves projectiles. */
  private resolveCombat(deltaTime: number) {
    const aliveTanks = [...this.state.tanks.values()].filter((tank) => tank.state !== "dead");
    const minions = [...this.state.minions.values()];
    const bases = [...this.state.bases.values()].filter((base) => !hasDied(base.hp));
    const towers = getLivingTowers(this.state.towers.values());
    const enemyCandidates: Array<Tank | Minion | Base | Tower> = [...aliveTanks, ...minions, ...bases, ...towers];

    for (const tank of aliveTanks) this.updateLockedShooter(tank, enemyCandidates, deltaTime);
    for (const minion of minions) this.updateShooter(minion, enemyCandidates, deltaTime);
    for (const tower of towers) this.updateShooter(tower, enemyCandidates, deltaTime);

    this.updateProjectiles(deltaTime);
  }

  /**
   * Fires a player tank at its player-selected locked target when one is set and in
   * range. When the tank has no locked target (or its lock was just cleared because
   * the target became invalid), it falls back to automatically engaging the nearest
   * enemy already within its fire range, the same way minions do -- this does not
   * move the tank into range, it only opportunistically fires at whatever enemy is
   * already nearby.
   */
  private updateLockedShooter(tank: Tank, enemyCandidates: Array<Tank | Minion | Base | Tower>, deltaTime: number) {
    if (tank.fireCooldown > 0) tank.fireCooldown = Math.max(0, tank.fireCooldown - deltaTime);
    if (tank.lockedTargetId) {
      const target = this.findLivingEntity(tank.lockedTargetId);
      if (!target || target.team === tank.team) {
        tank.lockedTargetId = "";
        tank.targetId = "";
      } else if (isWithinRange(tank, target, tank.fireRange)) {
        tank.targetId = target.id;
        if (tank.fireCooldown <= 0) {
          this.spawnProjectile(tank, target);
          tank.fireCooldown = this.computeFireCooldown(tank);
        }
        return;
      } else {
        // Still locked but out of range: keep chasing (handled by updateTankMovement)
        // and don't auto-engage a different, merely-nearby enemy in the meantime.
        tank.targetId = "";
        return;
      }
    }

    const target = findNearestEnemyInRange(tank, enemyCandidates, tank.fireRange);
    tank.targetId = target?.id ?? "";
    if (target && tank.fireCooldown <= 0) {
      this.spawnProjectile(tank, target);
      tank.fireCooldown = this.computeFireCooldown(tank);
    }
  }

  /** Computes a tank's next fire cooldown, applying the Damagedealer's rapid-fire multiplier while active. */
  private computeFireCooldown(tank: Tank): number {
    if (tank.role !== "damagedealer") return tank.fireCooldownMax;
    const active = isAbilityActive(Date.now(), tank.abilityActiveUntil);
    return effectiveFireCooldown(tank.fireCooldownMax, active, ROLE_ABILITY_CONFIG.damagedealer.magnitude);
  }

  /** Acquires the nearest enemy target -- including enemy bases -- (ignoring all friendly units) and fires when ready. */
  private updateShooter(unit: Tank | Minion | Tower, enemyCandidates: Array<Tank | Minion | Base | Tower>, deltaTime: number) {
    tickShooter(unit, enemyCandidates, deltaTime, (shooter, target) => this.spawnProjectile(shooter, target));
  }

  private spawnProjectile(shooter: Tank | Minion | Tower, target: { id: string }) {
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

  /** Looks up a still-alive tank, minion, or not-yet-destroyed base by id. */
  private findLivingEntity(id: string): Tank | Minion | Base | Tower | undefined {
    const tank = this.state.tanks.get(id);
    if (tank) return tank.state === "dead" ? undefined : tank;
    const minion = this.state.minions.get(id);
    if (minion) return minion;
    const base = this.state.bases.get(id);
    if (base) return hasDied(base.hp) ? undefined : base;
    const tower = this.state.towers.get(id);
    if (tower) return hasDied(tower.hp) ? undefined : tower;
    return undefined;
  }

  private applyDamage(entity: Tank | Minion | Base | Tower, damage: number) {
    const effectiveDamage = entity instanceof Tank && entity.role === "tank"
      ? applyShieldReduction(damage, isAbilityActive(Date.now(), entity.abilityActiveUntil), ROLE_ABILITY_CONFIG.tank.magnitude)
      : damage;
    entity.hp = computeDamagedHp(entity.hp, effectiveDamage);
    if (!hasDied(entity.hp)) return;
    if (entity instanceof Tank) {
      this.killTank(entity);
    } else if (entity instanceof Minion) {
      this.state.minions.delete(entity.id);
      this.minionPaths.delete(entity.id);
    } else if (entity instanceof Tower) {
      this.state.towers.delete(entity.id);
    }
  }

  private killTank(tank: Tank) {
    tank.state = "dead";
    tank.targetId = "";
    tank.lockedTargetId = "";
    tank.hasMoveTarget = false;
    tank.respawnAt = Date.now() + RESPAWN_DELAY_MS;
  }

  /** Applies the base stats for a tank's currently selected role (spawn/match-start stat setup). */
  private applyRoleStats(tank: Tank) {
    const stats = resolveRoleStats(tank.role);
    tank.maxHp = stats.maxHp;
    tank.hp = stats.maxHp;
    tank.moveSpeed = stats.moveSpeed;
    tank.fireRange = stats.fireRange;
    tank.fireCooldownMax = stats.fireCooldownMax;
    tank.fireDamage = stats.fireDamage;
    tank.abilityCooldownMax = resolveRoleAbilityConfig(tank.role).cooldownMs;
  }

  /** Heals every Healer with an active aura, and every allied tank within its radius, once per tick. */
  private resolveHealerAuras(elapsedSeconds: number, now: number) {
    this.state.tanks.forEach((healer) => {
      if (healer.role !== "healer" || healer.state === "dead") return;
      if (!isAbilityActive(now, healer.abilityActiveUntil)) return;
      const config = ROLE_ABILITY_CONFIG.healer;
      this.state.tanks.forEach((ally) => {
        if (ally.state === "dead" || ally.team !== healer.team) return;
        if (!isWithinRange(healer, ally, config.radius ?? 0)) return;
        ally.hp = healOverTick(ally.hp, ally.maxHp, config.magnitude, elapsedSeconds);
      });
    });
  }

  /** Restores a dead tank to full HP at its team's base once its respawn delay has elapsed. */
  private resolveRespawns(now: number) {
    this.state.tanks.forEach((tank) => {
      if (!isReadyToRespawn(tank, now)) return;
      const base = this.state.bases.get(`${tank.team}-base`);
      const respawned = respawnTank(tank.maxHp, base?.x ?? tank.x, base?.y ?? tank.y, WORLD_BOUNDS);
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

  private createLaneTowers() {
    const blueBase = this.state.bases.get("blue-base");
    const redBase = this.state.bases.get("red-base");
    if (!blueBase || !redBase) return;
    for (const placement of getLaneTowerPlacements(blueBase, redBase)) {
      const tower = new Tower();
      tower.id = `${placement.team}-tower-lane-${placement.laneIndex}-${placement.towerIndex}`;
      tower.team = placement.team;
      tower.x = placement.x;
      tower.y = placement.y;
      tower.radius = 24;
      this.state.towers.set(tower.id, tower);
    }
  }

  private spawnWave() {
    const blueBase = this.state.bases.get("blue-base");
    const redBase = this.state.bases.get("red-base");
    if (!blueBase || !redBase) return;
    const lanePaths = getLaneWaypoints(blueBase, redBase);
    for (const base of [blueBase, redBase]) {
      for (const lanePath of lanePaths) {
        const minion = new Minion();
        minion.id = `${base.team}-minion-${Date.now()}-${Math.random()}`;
        minion.team = base.team;
        minion.x = base.x;
        minion.y = base.y;
        const path = base.team === "blue" ? lanePath : [...lanePath].reverse();
        const [start, firstWaypoint, ...restOfPath] = path;
        minion.x = start.x;
        minion.y = start.y;
        minion.waypointX = firstWaypoint.x;
        minion.waypointY = firstWaypoint.y;
        this.minionPaths.set(minion.id, restOfPath);
        this.state.minions.set(minion.id, minion);
      }
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
    const ownBase = this.state.bases.get(`${tank.team}-base`);
    const spawnPoint = ownBase
      ? nearBasePosition(ownBase.x, ownBase.y, WORLD_BOUNDS)
      : { x: Math.random() * 1500, y: Math.random() * 1500 };
    tank.x = spawnPoint.x;
    tank.y = spawnPoint.y;
    this.applyRoleStats(tank);
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
