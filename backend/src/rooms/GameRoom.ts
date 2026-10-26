import { Room, Client } from "colyseus";
import { Base, computeAbilityConfigForLevel, GameState, getLaneWaypoints, isAbilityId, MatchPlayerStats, Minion, Projectile, Tank, Tower } from "shared";
import { isRole, resolveRoleStats } from "shared";
import { BLUE_BASE_POSITION, RED_BASE_POSITION, WORLD_WIDTH, WORLD_HEIGHT, TeamVision, getVisionEntities, INVALID_TARGET_MESSAGE, TOWER_COLLISION_RADIUS } from "shared";
import { lobbyRegistry } from "../lobbies/LobbyRegistry.js";
import { canChangeRole, canChangeTeam, canJoinRoom, canManageLobby, canUseGameplayActions, normalizePlayerName, resolveHostAfterLeave, selectBalancedTeam } from "./lobbyControls.js";
import { allPlayersReady, COUNTDOWN_DURATION_MS, LOBBY_ACTION_ERROR } from "shared";
import { clampToBounds, createShotProjectile, findNearestEnemyInRange, getLivingTowers, hasDied, hasProjectileReachedTarget, isReadyToRespawn, isWithinRange, stepHomingProjectile, stepProjectileTowardTarget, stepToward, applyDamage as computeDamagedHp, nearBasePosition, respawnDelayMs, respawnTank, tickShooter } from "./combat.js";
import { activateAbility, applyDamageReduction, canActivateRoleAbility, effectiveFireCooldown, effectiveMoveSpeed, healOverTick, homingRocketDamage, isAbilityActive, isMovementLocked, isValidRocketTarget, strongestReduction } from "./ability.js";
import { getLaneTowerPlacements } from "./towerPlacement.js";
import { effectiveTerrainMoveSpeed } from "./terrain.js";
import { applyTankProgressionStats, distributeKillXp, purchaseAbilityUpgrade } from "./progressionService.js";
import { endMatchAfterBaseDestroyed, recordPlayerDamage, recordPlayerKill, removeLeavingPlayerTank } from "./matchResults.js";
import { VisibilitySerializer } from "./VisibilitySerializer.js";
import { MORTAR_IMPACT_MESSAGE, mortarPointRejection } from "shared";
import type { MortarImpactMessage, MortarRejectionReason } from "shared";
import { mortarDamage } from "./ability.js";
import { byId, COLLISION_TOLERANCE, findClearNearBase, findLaneSpawn, movementBlockers, resolveMovement } from "./collision.js";
import { moveMinion, type MinionDetour } from "./minionMovement.js";

interface MortarFlight {
  originX: number;
  originY: number;
  elapsedMs: number;
  durationMs: number;
  buildingMultiplier: number;
}

interface PendingMinion {
  minion: Minion;
  base: Base;
  path: Array<{ x: number; y: number }>;
  logged: boolean;
}

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
  private mortarFlights = new Map<string, MortarFlight>();
  private minionPaths = new Map<string, Array<{ x: number; y: number }>>();
  private minionDetours = new Map<string, MinionDetour>();
  private pendingMinions = new Map<string, PendingMinion>();
  private deferredTanks = new Set<string>();
  private nextMinionId = 0;
  private lobbyId!: string;
  private ownsLobby = false;
  private countdown?: { deadline: number; timer?: { clear(): void } };

  onCreate (options: any) {
    console.log("GameRoom created!", options);
    this.setMetadata({ lobbyId: options.lobbyId });
    const lobby = lobbyRegistry.get(options.lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    lobbyRegistry.claimRoom(lobby.id);
    this.lobbyId = lobby.id;
    this.ownsLobby = true;
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
      const clamped = clampToBounds({ x, y }, MIN_X + tank.radius, MAX_X - tank.radius, MIN_Y + tank.radius, MAX_Y - tank.radius);
      tank.moveTargetX = clamped.x;
      tank.moveTargetY = clamped.y;
      tank.hasMoveTarget = true;
      tank.lockedTargetId = "";
    });
    this.onMessage("change_team", (client, team: unknown) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || !canChangeTeam(this.state.phase, team, tank.ready)) {
        this.rejectLobbyAction(client, "Team changes require a not-ready player in a waiting lobby.");
        return;
      }
      if (tank) {
        tank.team = team;
        const stats = this.state.playerStats.get(client.sessionId);
        if (stats) stats.team = team;
      }
    });
    this.onMessage("select_role", (client, role: unknown) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || !canChangeRole(this.state.phase, role, tank.ready)) {
        this.rejectLobbyAction(client, "Role changes require a not-ready player in a waiting lobby.");
        return;
      }
      tank.role = role;
    });
    this.onMessage("set_ready", (client, ready: unknown) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || this.state.phase !== "waiting" || typeof ready !== "boolean") {
        this.rejectLobbyAction(client, "Readiness can only be changed for yourself while waiting.");
        return;
      }
      tank.ready = ready;
    });
    this.onMessage("activate_ability", (client, payload: { abilityId?: unknown; targetId?: unknown; targetX?: unknown; targetY?: unknown }) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (payload?.abilityId === "damagedealer-mortar") {
        this.activateMortar(client, tank, payload.targetX, payload.targetY);
        return;
      }
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
    this.onMessage("*", (client, type) => {
      this.rejectLobbyAction(client, type === "rename_lobby" ? "Game names cannot be changed after creation." : "Unknown action.");
    });
    this.onMessage("start_game", (client) => {
      if (!this.state.tanks.has(client.sessionId)
        || !canManageLobby(this.state.phase, client.sessionId, this.state.hostSessionId)
        || !allPlayersReady(this.state.tanks.values())) {
        this.rejectLobbyAction(client, "Only the host can start while waiting, and every player must be ready.");
        return;
      }
      this.beginCountdown();
    });

    // Fixed time-step game loop (60 FPS)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 60);
  }

  private rejectLobbyAction(client: Client, message: string) {
    console.warn(`[Lobby] Rejected action from ${client.sessionId}: ${message}`);
    client.send(LOBBY_ACTION_ERROR, { message });
  }

  private beginCountdown() {
    lobbyRegistry.setCountdown(this.lobbyId, true);
    this.state.phase = "countdown";
    this.state.countdownSeconds = COUNTDOWN_DURATION_MS / 1000;
    this.state.countdownCancelReason = "";
    const countdown: { deadline: number; timer?: { clear(): void } } = {
      deadline: this.clock.elapsedTime + COUNTDOWN_DURATION_MS
    };
    this.countdown = countdown;
    const tick = () => {
      if (this.countdown !== countdown || this.state.phase !== "countdown") return;
      const remaining = countdown.deadline - this.clock.elapsedTime;
      if (remaining <= 0) {
        if (!allPlayersReady(this.state.tanks.values())) {
          this.cancelCountdown();
          return;
        }
        this.countdown = undefined;
        this.state.countdownSeconds = 0;
        lobbyRegistry.setCountdown(this.lobbyId, false);
        this.state.tanks.forEach((tank) => this.applyRoleStats(tank));
        this.createLaneTowers();
        const tanks = [...this.state.tanks.values()].sort(byId);
        for (const tank of tanks) tank.state = "dead";
        for (const tank of tanks) this.activateTank(tank);
        this.state.phase = "started";
        return;
      }
      this.state.countdownSeconds = Math.ceil(remaining / 1000);
      countdown.timer = this.clock.setTimeout(tick, Math.min(1000, remaining));
    };
    countdown.timer = this.clock.setTimeout(tick, 1000);
  }

  private cancelCountdown() {
    this.countdown?.timer?.clear();
    this.countdown = undefined;
    if (this.state?.phase !== "countdown") return;
    this.state.phase = "waiting";
    this.state.countdownSeconds = 0;
    this.state.countdownCancelReason = "player_left";
    lobbyRegistry.setCountdown(this.lobbyId, false);
  }

  update(deltaTime: number) {
    if (!canUseGameplayActions(this.state.phase)) {
      this.clearMortarFlights();
      if (this.state.phase === "ended") this.clearMovementState();
      return;
    }
    const elapsedSeconds = deltaTime / 1000;
    const now = Date.now();

    // Resolve targeting/firing before movement so units that are engaged
    // with an enemy this tick hold their ground instead of marching through it.
    this.resolveCombat(deltaTime);
    if (!canUseGameplayActions(this.state.phase)) return;
    this.resolveRespawns(now);
    this.updateTankMovement(elapsedSeconds);
    this.resolveHealerAuras(elapsedSeconds, now);

    this.updateMinionMovement(elapsedSeconds);
    this.resolvePendingMinions();

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
    [...this.state.tanks.values()].sort(byId).forEach((tank) => {
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
        const next = stepToward(tank, target, speed, 0);
        this.moveTank(tank, next);
        return;
      }
      if (!tank.hasMoveTarget) return;
      const next = stepToward(tank, { x: tank.moveTargetX, y: tank.moveTargetY }, speed, 0);
      this.moveTank(tank, next);
      if (Math.hypot(tank.x - tank.moveTargetX, tank.y - tank.moveTargetY) <= COLLISION_TOLERANCE) tank.hasMoveTarget = false;
    });
  }

  private moveTank(tank: Tank, destination: { x: number; y: number }) {
    const position = resolveMovement(tank, { x: destination.x - tank.x, y: destination.y - tank.y },
      tank.radius, movementBlockers(tank, this.state), WORLD_BOUNDS);
    tank.x = position.x;
    tank.y = position.y;
  }

  private updateMinionMovement(elapsedSeconds: number) {
    for (const minion of [...this.state.minions.values()].sort(byId)) {
      if (minion.targetId || minion.hp <= 0) continue;
      const speed = effectiveTerrainMoveSpeed(minion.speed, minion) * elapsedSeconds;
      const position = moveMinion(minion, speed, movementBlockers(minion, this.state), WORLD_BOUNDS, this.minionDetours);
      minion.x = position.x;
      minion.y = position.y;
      if (Math.hypot(minion.waypointX - minion.x, minion.waypointY - minion.y) <= 1) {
        const next = this.minionPaths.get(minion.id)?.shift();
        if (next) {
          minion.waypointX = next.x;
          minion.waypointY = next.y;
          this.minionDetours.delete(minion.id);
        }
      }
    }
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

  private activateMortar(client: Client, tank: Tank | undefined, x: unknown, y: unknown) {
    const reject = (reason: MortarRejectionReason) => client.send(INVALID_TARGET_MESSAGE, { action: "mortar", reason });
    if (!tank || !canUseGameplayActions(this.state.phase) || tank.state === "dead" || tank.hp <= 0) {
      reject("inactive");
      return;
    }
    if (tank.role !== "damagedealer") {
      reject("unavailable");
      return;
    }
    const ability = tank.abilities.get("damagedealer-mortar");
    if (!ability || ability.level <= 0) {
      reject("unlearned");
      return;
    }
    const now = Date.now();
    if (now < ability.cooldownEndsAt) {
      reject("cooldown");
      return;
    }
    const config = computeAbilityConfigForLevel("damagedealer-mortar", ability.level);
    const reason = mortarPointRejection(tank, x, y, config.range!);
    if (reason) {
      reject(reason);
      return;
    }
    // The validator above checks unknown transport coordinates before narrowing.
    if (typeof x !== "number" || typeof y !== "number") throw new Error("Validated Mortar point is not numeric");
    const projectile = new Projectile();
    projectile.id = `mortar-${now}-${Math.random()}`;
    projectile.team = tank.team;
    projectile.ownerId = tank.id;
    projectile.x = tank.x;
    projectile.y = tank.y;
    projectile.isMortar = true;
    projectile.landingX = x;
    projectile.landingY = y;
    projectile.blastRadius = config.radius!;
    projectile.damage = mortarDamage(tank.fireDamage, ability.level);
    this.mortarFlights.set(projectile.id, {
      originX: tank.x, originY: tank.y, elapsedMs: 0,
      durationMs: config.flightDurationMs!, buildingMultiplier: config.buildingMultiplier!
    });
    this.state.projectiles.set(projectile.id, projectile);
    Object.assign(ability, activateAbility(now, config));
  }

  private resolveMortarImpact(projectile: Projectile, flight: MortarFlight) {
    const impact: MortarImpactMessage = {
      shotId: projectile.id, team: projectile.team,
      x: projectile.landingX, y: projectile.landingY, radius: projectile.blastRadius
    };
    // Capture authorized recipients before deaths remove their vision observers.
    for (const client of this.clients) {
      const team = this.state.tanks.get(client.sessionId)?.team;
      if (team && (team === projectile.team || this.teamVision(team).canSee(impact))) {
        client.send(MORTAR_IMPACT_MESSAGE, impact);
      }
    }
    const candidates = [
      ...this.state.tanks.values(), ...this.state.minions.values(),
      ...this.state.towers.values(), ...this.state.bases.values()
    ];
    for (const entity of candidates) {
      if (!canUseGameplayActions(this.state.phase)) break;
      if (entity.team === projectile.team || entity.hp <= 0
        || (entity instanceof Tank && entity.state === "dead")
        || !isWithinRange(impact, entity, impact.radius)) continue;
      const multiplier = entity instanceof Tower || entity instanceof Base ? flight.buildingMultiplier : 1;
      this.applyDamage(entity, projectile.damage * multiplier, projectile.ownerId);
    }
  }

  private clearMortarFlights() {
    for (const id of this.mortarFlights.keys()) {
      if (this.state.projectiles.has(id)) this.state.projectiles.delete(id);
    }
    this.mortarFlights.clear();
  }

  /** Moves every in-flight projectile toward its target, applies damage on impact, and cleans up. */
  private updateProjectiles(deltaTime: number) {
    if (!canUseGameplayActions(this.state.phase)) {
      this.clearMortarFlights();
      return;
    }
    const elapsedSeconds = deltaTime / 1000;
    const toRemove: string[] = [];
    for (const id of this.mortarFlights.keys()) {
      if (!this.state.projectiles.has(id)) this.mortarFlights.delete(id);
    }

    for (const projectile of [...this.state.projectiles.values()]) {
      if (!canUseGameplayActions(this.state.phase)) break;
      if (projectile.isMortar) {
        const flight = this.mortarFlights.get(projectile.id);
        if (!flight) throw new Error(`Missing Mortar flight metadata for ${projectile.id}`);
        flight.elapsedMs += deltaTime;
        projectile.flightProgress = Math.min(1, flight.elapsedMs / flight.durationMs);
        projectile.x = flight.originX + (projectile.landingX - flight.originX) * projectile.flightProgress;
        projectile.y = flight.originY + (projectile.landingY - flight.originY) * projectile.flightProgress;
        if (projectile.flightProgress >= 1) {
          this.resolveMortarImpact(projectile, flight);
          toRemove.push(projectile.id);
        }
        continue;
      }
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
      if (this.state.projectiles.has(id)) this.state.projectiles.delete(id);
      this.projectileLifetimes.delete(id);
      this.mortarFlights.delete(id);
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
      this.minionDetours.delete(entity.id);
      distributeKillXp(victimPos, false, this.state.tanks.values());
    } else if (entity instanceof Tower) {
      entity.targetId = "";
    } else if (entity instanceof Base) {
      if (endMatchAfterBaseDestroyed(this.state, entity.team)) {
        this.projectileLifetimes.clear();
        this.clearMortarFlights();
        this.clearMovementState();
      }
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
    [...this.state.tanks.values()].sort(byId).forEach((tank) => {
      if (!isReadyToRespawn(tank, now)) return;
      this.activateTank(tank);
    });
  }

  private activateTank(tank: Tank) {
    const base = this.state.bases.get(`${tank.team}-base`);
    if (!base) throw new Error(`Missing base for tank ${tank.id}`);
    const position = findClearNearBase(base, tank.radius, movementBlockers(tank, this.state), WORLD_BOUNDS, tank);
    if (position) {
      const respawned = respawnTank(tank.maxHp, position.x, position.y);
      Object.assign(tank, respawned);
      this.deferredTanks.delete(tank.id);
    } else {
      tank.state = "dead";
      tank.hp = 0;
      if (!this.deferredTanks.has(tank.id)) console.warn(`Tank activation deferred: ${tank.id}`);
      this.deferredTanks.add(tank.id);
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

  private createLaneTowers() {
    const blueBase = this.state.bases.get("blue-base");
    const redBase = this.state.bases.get("red-base");
    if (!blueBase || !redBase) return;
    for (const placement of getLaneTowerPlacements(blueBase, redBase)) {
      const tower = new Tower();
      tower.id = `${placement.team}-tower-lane-${placement.laneIndex}-${placement.towerIndex}-${placement.side}`;
      tower.team = placement.team;
      tower.x = placement.x;
      tower.y = placement.y;
      tower.radius = TOWER_COLLISION_RADIUS;
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
        minion.id = `${base.team}-minion-${this.nextMinionId++}`;
        minion.team = base.team;
        minion.x = base.x;
        minion.y = base.y;
        const path = base.team === "blue" ? lanePath : [...lanePath].reverse();
        const [start, firstWaypoint, ...restOfPath] = path;
        minion.x = start.x;
        minion.y = start.y;
        minion.waypointX = firstWaypoint.x;
        minion.waypointY = firstWaypoint.y;
        this.pendingMinions.set(minion.id, { minion, base, path: restOfPath, logged: false });
      }
    }
    this.resolvePendingMinions();
  }

  private resolvePendingMinions() {
    // Rotate failed entries to the back so a saturated spawn area cannot starve others.
    const candidates: Array<[string, PendingMinion]> = [];
    for (const entry of this.pendingMinions) {
      candidates.push(entry);
      if (candidates.length === 12) break;
    }
    for (const [id, pending] of candidates) {
      const { minion, base, path } = pending;
      const position = findLaneSpawn(base, { x: minion.waypointX, y: minion.waypointY }, minion.radius,
        movementBlockers(minion, this.state), WORLD_BOUNDS);
      if (!position) {
        if (!pending.logged) console.warn(`Minion spawn deferred: ${id}`);
        pending.logged = true;
        this.pendingMinions.delete(id);
        this.pendingMinions.set(id, pending);
        continue;
      }
      minion.x = position.x;
      minion.y = position.y;
      this.minionPaths.set(id, path);
      this.state.minions.set(id, minion);
      this.pendingMinions.delete(id);
    }
  }

  private clearMovementState() {
    this.pendingMinions.clear();
    this.deferredTanks.clear();
    this.minionDetours.clear();
    this.minionPaths.clear();
  }

  onJoin (client: Client, options: any) {
    if (!canJoinRoom(this.state.phase)) throw new Error("Game is unavailable: countdown in progress or match ended.");
    console.log(client.sessionId, "joined!");
    lobbyRegistry.join(this.lobbyId);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    const tank = new Tank();
    tank.id = client.sessionId;
    tank.name = normalizePlayerName(options?.playerName);
    const team = this.nextTeam();
    tank.team = team;
    const ownBase = this.state.bases.get(`${tank.team}-base`);
    if (!ownBase) throw new Error(`Missing base for team ${tank.team}`);
    const spawnPoint = nearBasePosition(ownBase.x, ownBase.y, WORLD_BOUNDS);
    tank.x = spawnPoint.x;
    tank.y = spawnPoint.y;
    this.applyRoleStats(tank);
    this.activateTank(tank);
    this.state.tanks.set(client.sessionId, tank);
    const playerStats = new MatchPlayerStats();
    playerStats.name = tank.name;
    playerStats.team = team;
    this.state.playerStats.set(client.sessionId, playerStats);
  }

  onLeave (client: Client, consented: boolean) {
    this.visibilitySerializer.removeClient(client);
    // A rejected seat reservation never became a participant.
    if (!this.state.tanks.has(client.sessionId)) return;
    this.cancelCountdown();
    console.log(client.sessionId, "left!");
    removeLeavingPlayerTank(this.state, client.sessionId);
    this.deferredTanks.delete(client.sessionId);
    this.state.hostSessionId = resolveHostAfterLeave(
      client.sessionId,
      this.state.hostSessionId,
      this.state.tanks.keys()
    );
    lobbyRegistry.leave(this.lobbyId);
  }

  onDispose() {
    this.cancelCountdown();
    if (this.ownsLobby) lobbyRegistry.releaseRoom(this.lobbyId);
    this.ownsLobby = false;
    this.clearMovementState();
    this.clearMortarFlights();
    this.projectileLifetimes.clear();
    this.visibilitySerializer.dispose();
    console.log("room", this.roomId, "disposing...");
  }

  private nextTeam(): "red" | "blue" {
    return selectBalancedTeam(this.state.tanks.values());
  }
}
