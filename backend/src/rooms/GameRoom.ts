import { Room, Client } from "colyseus";
import { Base, computeAbilityConfigForLevel, GameState, getLaneWaypoints, isAbilityId, MatchPlayerStats, Minion, Projectile, Tank, Tower } from "shared";
import { isRole, resolveRoleStats } from "shared";
import { BLUE_BASE_POSITION, RED_BASE_POSITION, WORLD_WIDTH, WORLD_HEIGHT, TeamVision, getVisionEntities, INVALID_TARGET_MESSAGE } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { canChangeRole, canChangeTeam, canJoinRoom, canManageLobby, canUseGameplayActions, normalizeLobbyName, normalizePlayerName, resolveHostAfterLeave, selectBalancedTeam } from "./lobbyControls.js";
import { clampToBounds, createShotProjectile, findNearestEnemyInRange, getLivingTowers, hasDied, hasProjectileReachedTarget, isReadyToRespawn, isWithinRange, stepHomingProjectile, stepProjectileTowardTarget, stepToward, applyDamage as computeDamagedHp, nearBasePosition, respawnDelayMs, respawnTank, tickShooter } from "./combat.js";
import { activateAbility, applyDamageReduction, canActivateRoleAbility, effectiveFireCooldown, effectiveMoveSpeed, healOverTick, homingRocketDamage, isAbilityActive, isMovementLocked, isValidRocketTarget, strongestReduction } from "./ability.js";
import { getLaneTowerPlacements } from "./towerPlacement.js";
import { effectiveTerrainMoveSpeed } from "./terrain.js";
import { applyTankProgressionStats, distributeKillXp, purchaseAbilityUpgrade } from "./progressionService.js";
import { endMatchAfterBaseDestroyed, recordPlayerDamage, recordPlayerKill, removeLeavingPlayerTank } from "./matchResults.js";
import { VisibilitySerializer } from "./VisibilitySerializer.js";

const PROJECTILE_HIT_RADIUS = 12;
const PROJECTILE_MAX_LIFETIME_MS = 3000;

// World is 3x the original 800x600 arena so the camera only shows part of the map at once.
export { WORLD_WIDTH, WORLD_HEIGHT } from "shared";
const WORLD_MARGIN = 60;
const MIN_X = WORLD_MARGIN;
const MAX_X = WORLD_WIDTH - WORLD_MARGIN;
const MIN_Y = WORLD_MARGIN;
const MAX_Y = WORLD_HEIGHT - WORLD_MARGIN;
const WORLD_BOUNDS = { minX: MIN_X, maxX: MAX_X, minY: MIN_Y, maxY: MAX_Y };

export class GameRoom extends Room<GameState> {
  maxClients = 10;
  private readonly visibilitySerializer = new VisibilitySerializer();
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
    this.visibilitySerializer.reset(state);
    this.setSerializer(this.visibilitySerializer);
    this.createBase("blue", BLUE_BASE_POSITION.x, BLUE_BASE_POSITION.y);
    this.createBase("red", RED_BASE_POSITION.x, RED_BASE_POSITION.y);
    this.onMessage("command", (client, command: { x?: unknown; y?: unknown; targetId?: unknown }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || !canUseGameplayActions(this.state.phase) || tank.state === "dead") return;
      const targetId = typeof command?.targetId === "string" ? command.targetId : "";
      if (targetId) {
        const target = this.findLivingEntity(targetId);
        if (!target || !this.teamVision(tank.team).canSee(target)) {
          client.send(INVALID_TARGET_MESSAGE, { action: "attack", reason: "invalid_target" });
          return;
        }
        if (target.team !== tank.team) {
          tank.lockedTargetId = targetId;
          tank.hasMoveTarget = false;
          return;
        }
        // Friendly targetId: fall through and treat it as a move-to-point instead.
      }
      if (this.isEntrenched(tank, Date.now())) return;
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
      if (tank) {
        tank.team = team;
        const stats = this.state.playerStats.get(client.sessionId);
        if (stats) stats.team = team;
      }
    });
    this.onMessage("select_role", (client, role: unknown) => {
      if (!canChangeRole(this.state.phase, role)) return;
      const tank = this.state.tanks.get(client.sessionId);
      if (tank) tank.role = role;
    });
    this.onMessage("activate_ability", (client, payload: { abilityId?: unknown; targetId?: unknown }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || !canUseGameplayActions(this.state.phase) || tank.state === "dead") return;
      if (!isAbilityId(payload?.abilityId) || !isRole(tank.role)) return;
      const abilityId = payload.abilityId;
      const ability = tank.abilities.get(abilityId);
      const now = Date.now();
      if (!ability || !canActivateRoleAbility(now, tank.role, abilityId, ability)) return;
      const abilityConfig = computeAbilityConfigForLevel(abilityId, ability.level);
      if (abilityId === "damagedealer-homing-rocket") {
        if (typeof payload.targetId !== "string") return;
        const target = this.findLivingEntity(payload.targetId);
        if (!target || !this.teamVision(tank.team).canSee(target)
          || !isValidRocketTarget(tank, target, abilityConfig.range ?? 0)) {
          client.send(INVALID_TARGET_MESSAGE, { action: "rocket", reason: "invalid_target" });
          return;
        }
        this.spawnHomingRocket(tank, target, homingRocketDamage(tank.fireDamage, ability.level), abilityConfig.projectileSpeed ?? 450);
      }
      const timing = activateAbility(now, abilityConfig);
      ability.cooldownEndsAt = timing.cooldownEndsAt;
      ability.cooldownMax = timing.cooldownMax;
      ability.activeUntil = timing.activeUntil;
      if (abilityId === "tank-entrench") {
        tank.hasMoveTarget = false;
      }
    });
    this.onMessage("upgrade_ability", (client, payload: { abilityId?: unknown }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || this.state.phase !== "started" || tank.state === "dead") return;
      purchaseAbilityUpgrade(tank, payload?.abilityId);
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
    if (!canUseGameplayActions(this.state.phase)) return;
    const elapsedSeconds = deltaTime / 1000;
    const now = Date.now();

    // Resolve targeting/firing before movement so units that are engaged
    // with an enemy this tick hold their ground instead of marching through it.
    this.resolveCombat(deltaTime);
    if (!canUseGameplayActions(this.state.phase)) return;
    this.resolveRespawns(now);
    this.updateTankMovement(elapsedSeconds);
    this.resolveHealerAuras(elapsedSeconds, now);

    this.state.minions.forEach((minion) => {
      if (minion.targetId) return;
      const dx = minion.waypointX - minion.x;
      const dy = minion.waypointY - minion.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) {
        const speed = effectiveTerrainMoveSpeed(minion.speed, minion) * elapsedSeconds;
        minion.x += dx / distance * speed;
        minion.y += dy / distance * speed;
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
      const now = Date.now();
      if (this.isEntrenched(tank, now)) return;
      const speedAbility = tank.abilities.get("healer-speed");
      const speedActive = tank.role === "healer" && isAbilityActive(now, speedAbility);
      const speedMultiplier = speedAbility
        ? computeAbilityConfigForLevel("healer-speed", speedAbility.level).magnitude
        : 1;
      const effectiveSpeed = effectiveMoveSpeed(tank.moveSpeed, speedActive, speedMultiplier);
      const speed = effectiveTerrainMoveSpeed(effectiveSpeed, tank) * elapsedSeconds;
      if (tank.lockedTargetId) {
        const target = this.findLivingEntity(tank.lockedTargetId);
        if (!target || target.team === tank.team || !this.teamVision(tank.team).canSee(target)) {
          tank.lockedTargetId = "";
          tank.targetId = "";
          tank.hasMoveTarget = false;
          return;
        }
        if (isWithinRange(tank, target, tank.fireRange)) return;
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
    const visibleCandidates = new Map<string, Array<Tank | Minion | Base | Tower>>();
    for (const team of ["blue", "red"]) {
      const vision = this.teamVision(team);
      visibleCandidates.set(team, enemyCandidates.filter((candidate) => candidate.team !== team && vision.canSee(candidate)));
    }
    for (const tank of aliveTanks) this.updateLockedShooter(tank, visibleCandidates.get(tank.team) ?? [], deltaTime);
    for (const minion of minions) this.updateShooter(minion, visibleCandidates.get(minion.team) ?? [], deltaTime);
    for (const tower of towers) this.updateShooter(tower, visibleCandidates.get(tower.team) ?? [], deltaTime);
    for (const base of bases) this.updateShooter(base, visibleCandidates.get(base.team) ?? [], deltaTime);

    this.updateProjectiles(deltaTime);
  }

  private teamVision(team: string): TeamVision {
    return new TeamVision(team, getVisionEntities(this.state));
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
      if (!target || !enemyCandidates.includes(target)) {
        tank.lockedTargetId = "";
        tank.targetId = "";
        tank.hasMoveTarget = false;
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
    const rapidFire = tank.abilities.get("damagedealer-rapidfire");
    const active = isAbilityActive(Date.now(), rapidFire);
    const abilityConfig = computeAbilityConfigForLevel("damagedealer-rapidfire", rapidFire?.level ?? 0);
    return effectiveFireCooldown(tank.fireCooldownMax, active, abilityConfig.magnitude);
  }

  /** Acquires the nearest enemy target -- including enemy bases -- (ignoring all friendly units) and fires when ready. */
  private updateShooter(unit: Tank | Minion | Tower | Base, enemyCandidates: Array<Tank | Minion | Base | Tower>, deltaTime: number) {
    tickShooter(unit, enemyCandidates, deltaTime, (shooter, target) => this.spawnProjectile(shooter, target));
  }

  private spawnProjectile(shooter: Tank | Minion | Tower | Base, target: { id: string; x: number; y: number; team: string }) {
    const projectile = createShotProjectile(shooter, target, `shot-${Date.now()}-${Math.random()}`);
    this.state.projectiles.set(projectile.id, projectile);
    this.projectileLifetimes.set(projectile.id, 0);
  }

  private spawnHomingRocket(shooter: Tank, target: { id: string }, damage: number, speed: number) {
    const projectile = new Projectile();
    projectile.id = `rocket-${Date.now()}-${Math.random()}`;
    projectile.team = shooter.team;
    projectile.ownerId = shooter.id;
    projectile.targetId = target.id;
    projectile.x = shooter.x;
    projectile.y = shooter.y;
    projectile.damage = damage;
    projectile.speed = speed;
    projectile.isHomingRocket = true;
    this.state.projectiles.set(projectile.id, projectile);
    this.projectileLifetimes.set(projectile.id, 0);
  }

  /** Moves every in-flight projectile toward its target, applies damage on impact, and cleans up. */
  private updateProjectiles(deltaTime: number) {
    const elapsedSeconds = deltaTime / 1000;
    const toRemove: string[] = [];

    for (const projectile of [...this.state.projectiles.values()]) {
      if (!canUseGameplayActions(this.state.phase)) break;
      const target = this.findLivingEntity(projectile.targetId);
      if (projectile.isHomingRocket) {
        if (!target) {
          toRemove.push(projectile.id);
          continue;
        }
        const step = stepHomingProjectile(projectile, target, projectile.speed, elapsedSeconds, PROJECTILE_HIT_RADIUS);
        if (step.status === "target-lost") {
          toRemove.push(projectile.id);
          continue;
        }
        projectile.x = step.position.x;
        projectile.y = step.position.y;
        if (step.status === "impact") {
          this.applyDamage(target, projectile.damage, projectile.ownerId);
          toRemove.push(projectile.id);
        }
        continue;
      }
      if (!target) {
        toRemove.push(projectile.id);
        continue;
      }

      const nextPosition = stepProjectileTowardTarget(projectile, target, projectile.speed, elapsedSeconds);
      projectile.x = nextPosition.x;
      projectile.y = nextPosition.y;

      if (hasProjectileReachedTarget(projectile.x, projectile.y, target.x, target.y, PROJECTILE_HIT_RADIUS)) {
        this.applyDamage(target, projectile.damage, projectile.ownerId);
        toRemove.push(projectile.id);
        continue;
      }

      if (!projectile.isHomingRocket) {
        const lifetime = (this.projectileLifetimes.get(projectile.id) ?? 0) + deltaTime;
        this.projectileLifetimes.set(projectile.id, lifetime);
        if (lifetime >= PROJECTILE_MAX_LIFETIME_MS) toRemove.push(projectile.id);
      }
    }

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

  private applyDamage(entity: Tank | Minion | Base | Tower, damage: number, attackerId = "") {
    if (entity instanceof Tank && entity.state === "dead") return;
    let effectiveDamage = damage;
    if (entity instanceof Tank && entity.role === "tank") {
      const now = Date.now();
      const shield = entity.abilities.get("tank-shield");
      const entrench = entity.abilities.get("tank-entrench");
      const shieldReduction = isAbilityActive(now, shield)
        ? computeAbilityConfigForLevel("tank-shield", shield?.level ?? 0).magnitude
        : 0;
      const entrenchReduction = isAbilityActive(now, entrench)
        ? computeAbilityConfigForLevel("tank-entrench", entrench?.level ?? 0).magnitude
        : 0;
      effectiveDamage = applyDamageReduction(damage, strongestReduction(shieldReduction, entrenchReduction));
    }
    const hpBefore = entity.hp;
    entity.hp = computeDamagedHp(entity.hp, effectiveDamage);
    const attackerStats = this.state.playerStats.get(attackerId);
    const actualDamage = recordPlayerDamage(attackerStats, entity.team, hpBefore, entity.hp);
    if (!hasDied(entity.hp)) return;
    if (entity instanceof Tank) {
      const victimPos = { x: entity.x, y: entity.y };
      if (actualDamage > 0) recordPlayerKill(attackerStats, entity.team);
      this.killTank(entity);
      distributeKillXp(victimPos, true, this.state.tanks.values());
    } else if (entity instanceof Minion) {
      const victimPos = { x: entity.x, y: entity.y };
      this.state.minions.delete(entity.id);
      this.minionPaths.delete(entity.id);
      distributeKillXp(victimPos, false, this.state.tanks.values());
    } else if (entity instanceof Tower) {
      entity.targetId = "";
    } else if (entity instanceof Base) {
      if (endMatchAfterBaseDestroyed(this.state, entity.team)) this.projectileLifetimes.clear();
    }
  }

  private killTank(tank: Tank) {
    const base = this.state.bases.get(`${tank.team}-base`)
      ?? (tank.team === "blue" ? BLUE_BASE_POSITION : RED_BASE_POSITION);
    const position = nearBasePosition(base.x, base.y, WORLD_BOUNDS);
    tank.hp = 0;
    tank.state = "dead";
    tank.x = position.x;
    tank.y = position.y;
    tank.targetId = "";
    tank.lockedTargetId = "";
    tank.hasMoveTarget = false;
    tank.moveTargetX = position.x;
    tank.moveTargetY = position.y;
    tank.abilities.forEach((ability) => { ability.activeUntil = 0; });
    tank.respawnAt = Date.now() + respawnDelayMs(tank.level);
  }

  /** Applies the base stats for a tank's currently selected role (spawn/match-start stat setup). */
  private applyRoleStats(tank: Tank) {
    const stats = resolveRoleStats(tank.role);
    tank.maxHp = stats.maxHp;
    tank.hp = stats.maxHp;
    tank.moveSpeed = stats.moveSpeed;
    tank.fireRange = stats.fireRange;
    tank.sightRange = stats.sightRange;
    tank.fireCooldownMax = stats.fireCooldownMax;
    tank.fireDamage = stats.fireDamage;
    applyTankProgressionStats(tank);
    tank.hp = tank.maxHp;
  }

  /** Heals every Healer with an active aura, and every allied tank within its radius, once per tick. */
  private resolveHealerAuras(elapsedSeconds: number, now: number) {
    this.state.tanks.forEach((healer) => {
      if (healer.role !== "healer" || healer.state === "dead") return;
      const aura = healer.abilities.get("healer-aura");
      if (!isAbilityActive(now, aura)) return;
      const config = computeAbilityConfigForLevel("healer-aura", aura?.level ?? 0);
      this.state.tanks.forEach((ally) => {
        if (ally.state === "dead" || ally.team !== healer.team) return;
        if (!isWithinRange(healer, ally, config.radius ?? 0)) return;
        ally.hp = healOverTick(ally.hp, ally.maxHp, config.magnitude, elapsedSeconds);
      });
    });
  }

  private isEntrenched(tank: Tank, now: number): boolean {
    return isMovementLocked(tank.role, isAbilityActive(now, tank.abilities.get("tank-entrench")));
  }

  /** Restores a dead tank to full HP at its team's base once its respawn delay has elapsed. */
  private resolveRespawns(now: number) {
    this.state.tanks.forEach((tank) => {
      if (!isReadyToRespawn(tank, now)) return;
      const respawned = respawnTank(tank.maxHp, tank.x, tank.y);
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
    if (!canJoinRoom(this.state.phase)) throw new Error("Match has ended");
    console.log(client.sessionId, "joined!");
    lobbyRegistry.join(options.lobbyId);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    const tank = new Tank();
    tank.id = client.sessionId;
    tank.name = normalizePlayerName(options?.playerName);
    const team = this.nextTeam();
    tank.team = team;
    const ownBase = this.state.bases.get(`${tank.team}-base`);
    const spawnPoint = ownBase
      ? nearBasePosition(ownBase.x, ownBase.y, WORLD_BOUNDS)
      : { x: Math.random() * 1500, y: Math.random() * 1500 };
    tank.x = spawnPoint.x;
    tank.y = spawnPoint.y;
    this.applyRoleStats(tank);
    this.state.tanks.set(client.sessionId, tank);
    const playerStats = new MatchPlayerStats();
    playerStats.name = tank.name;
    playerStats.team = team;
    this.state.playerStats.set(client.sessionId, playerStats);
  }

  onLeave (client: Client, consented: boolean) {
    this.visibilitySerializer.removeClient(client);
    console.log(client.sessionId, "left!");
    removeLeavingPlayerTank(this.state, client.sessionId);
    this.state.hostSessionId = resolveHostAfterLeave(
      client.sessionId,
      this.state.hostSessionId,
      this.state.tanks.keys()
    );
    lobbyRegistry.leave(this.metadata.lobbyId);
  }

  onDispose() {
    this.visibilitySerializer.dispose();
    console.log("room", this.roomId, "disposing...");
  }

  private nextTeam(): "red" | "blue" {
    return selectBalancedTeam(this.state.tanks.values());
  }
}
