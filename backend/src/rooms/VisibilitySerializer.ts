import { MapSchema, Schema } from "@colyseus/schema";
import { ClientState, SchemaSerializer } from "colyseus";
import type { Client, Serializer } from "colyseus";
import {
  Base, Entity, GameState, getVisionEntities, MatchPlayerStats, Minion,
  Projectile, Tank, TeamVision, Tower
} from "shared";

interface ClientView {
  state: GameState;
  serializer: SchemaSerializer<GameState>;
}

function syncMap<T extends Schema>(
  destination: MapSchema<T>,
  source: MapSchema<T>,
  create: () => T,
  allowed: (value: T, id: string) => boolean,
  copy: (destination: T, source: T, id: string) => void
): void {
  for (const id of destination.keys()) {
    const value = source.get(id);
    if (!value || !allowed(value, id)) destination.delete(id);
  }
  source.forEach((value, id) => {
    if (!allowed(value, id)) return;
    let projected = destination.get(id);
    if (!projected) {
      projected = create();
      destination.set(id, projected);
    }
    copy(projected, value, id);
  });
}

function copyEntity(destination: Entity, source: Entity): void {
  destination.id = source.id;
  destination.team = source.team;
  destination.x = source.x;
  destination.y = source.y;
  destination.radius = source.radius;
}

function copyCombat(destination: Tank | Minion | Base | Tower, source: Tank | Minion | Base | Tower): void {
  copyEntity(destination, source);
  destination.hp = source.hp;
  destination.maxHp = source.maxHp;
  destination.sightRange = source.sightRange;
  destination.fireRange = source.fireRange;
  destination.fireDamage = source.fireDamage;
  destination.fireCooldownMax = source.fireCooldownMax;
}

/** Keeps canonical schema objects entirely outside the outgoing schema trees. */
export function updateClientView(view: GameState, source: GameState, sessionId: string, vision: TeamVision): void {
  const now = Date.now();
  if (source.phase === "waiting" && view.phase !== "waiting") view.tanks.clear();
  view.phase = source.phase;
  view.lobbyName = source.lobbyName;
  view.hostSessionId = source.hostSessionId;
  view.winnerTeam = source.winnerTeam;
  const waiting = source.phase === "waiting";
  const team = vision.team;
  const spatialAllowed = (entity: Entity) => !!team && (entity.team === team || vision.canSee(entity));
  const unitAllowed = (entity: Tank | Minion) => !!team && (entity.team === team
    || (entity.hp > 0 && (!(entity instanceof Tank) || entity.state !== "dead") && vision.canSee(entity)));
  const visibleIds = new Set<string>();
  if (!waiting) {
    source.tanks.forEach((value, id) => { if (unitAllowed(value)) visibleIds.add(id); });
    source.minions.forEach((value, id) => { if (unitAllowed(value)) visibleIds.add(id); });
    source.towers.forEach((value, id) => { if (spatialAllowed(value)) visibleIds.add(id); });
    source.bases.forEach((value, id) => { if (spatialAllowed(value)) visibleIds.add(id); });
  }
  const visibleReference = (id: string) => visibleIds.has(id) ? id : "";

  syncMap(view.tanks, source.tanks, () => new Tank(),
    (_tank, id) => waiting ? !!team : visibleIds.has(id),
    (destination, tank, id) => {
      destination.id = tank.id;
      destination.name = tank.name;
      destination.team = tank.team;
      destination.role = tank.role;
      // Lobby clients need roster metadata, not canonical spawn coordinates.
      if (waiting) return;
      copyCombat(destination, tank);
      const own = id === sessionId;
      destination.rotation = tank.rotation;
      destination.state = tank.state;
      destination.respawnAt = own ? tank.respawnAt : 0;
      destination.level = tank.level;
      destination.moveSpeed = tank.moveSpeed;
      destination.targetId = visibleReference(tank.targetId);
      destination.lockedTargetId = own ? visibleReference(tank.lockedTargetId) : "";
      destination.hasMoveTarget = own && tank.hasMoveTarget;
      destination.moveTargetX = own ? tank.moveTargetX : 0;
      destination.moveTargetY = own ? tank.moveTargetY : 0;
      destination.fireCooldown = own ? tank.fireCooldown : 0;
      destination.xp = own ? tank.xp : 0;
      destination.skillPoints = own ? tank.skillPoints : 0;
      destination.abilities.forEach((ability, abilityId) => {
        const canonical = tank.abilities.get(abilityId);
        const activeUntil = canonical?.activeUntil ?? 0;
        ability.activeUntil = own || activeUntil > now ? activeUntil : 0;
        ability.level = own ? canonical?.level ?? 0 : 0;
        ability.cooldownEndsAt = own ? canonical?.cooldownEndsAt ?? 0 : 0;
        ability.cooldownMax = own ? canonical?.cooldownMax ?? 0 : 0;
      });
    });
  syncMap(view.minions, source.minions, () => new Minion(),
    (_minion, id) => visibleIds.has(id),
    (destination, minion) => {
      copyCombat(destination, minion);
      destination.speed = minion.speed;
      destination.targetId = visibleReference(minion.targetId);
    });
  const copyStructure = (destination: Base | Tower, structure: Base | Tower) => {
    copyCombat(destination, structure);
    destination.targetId = visibleReference(structure.targetId);
    destination.shotCount = structure.shotCount;
    destination.shotAngle = structure.shotAngle;
  };
  syncMap(view.bases, source.bases, () => new Base(),
    (_base, id) => visibleIds.has(id), copyStructure);
  syncMap(view.towers, source.towers, () => new Tower(),
    (_tower, id) => visibleIds.has(id), copyStructure);
  syncMap(view.projectiles, source.projectiles, () => new Projectile(),
    (projectile) => !waiting && spatialAllowed(projectile),
    (destination, projectile) => {
      copyEntity(destination, projectile);
      destination.ownerId = visibleReference(projectile.ownerId);
      destination.targetId = visibleReference(projectile.targetId);
      destination.speed = projectile.speed;
      destination.damage = projectile.damage;
      destination.isHomingRocket = projectile.isHomingRocket;
    });
  syncMap(view.playerStats, source.playerStats, () => new MatchPlayerStats(), () => true,
    (destination, stats) => {
      destination.name = stats.name;
      destination.team = stats.team;
      destination.kills = stats.kills;
      destination.level = stats.level;
      destination.damageDealt = stats.damageDealt;
    });
}

/** Ordinary schema ADD/DELETE deltas, isolated per connection rather than skip-only filters. */
export class VisibilitySerializer implements Serializer<GameState> {
  readonly id = "schema";
  private source!: GameState;
  private readonly views = new Map<Client, ClientView>();
  private readonly schema = new SchemaSerializer<GameState>();

  reset(state: GameState): void {
    this.source = state;
    this.views.clear();
    this.schema.reset(new GameState());
  }

  handshake(): number[] {
    return this.schema.handshake();
  }

  getFullState(client?: Client): number[] {
    if (!client) throw new Error("Visibility-scoped state requires a receiving client");
    const state = new GameState();
    const serializer = new SchemaSerializer<GameState>();
    serializer.reset(state);
    const view = { state, serializer };
    this.views.set(client, view);
    updateClientView(state, this.source, client.sessionId, this.visionFor(client));
    const encoded = serializer.getFullState(client);
    state.discardAllChanges();
    return encoded;
  }

  applyPatches(clients: Client[]): boolean {
    const connected = new Set(clients);
    for (const client of this.views.keys()) {
      if (!connected.has(client)) this.views.delete(client);
    }
    const entities = getVisionEntities(this.source);
    const visions = new Map<string, TeamVision>();
    let changed = false;
    for (const client of clients) {
      if (client.state !== ClientState.JOINED) continue;
      const view = this.views.get(client);
      // A joining client gets its first view exclusively via getFullState.
      if (!view) continue;
      const team = this.source.tanks.get(client.sessionId)?.team ?? "";
      let vision = visions.get(team);
      if (!vision) {
        vision = new TeamVision(team, entities);
        visions.set(team, vision);
      }
      updateClientView(view.state, this.source, client.sessionId, vision);
      changed = view.serializer.applyPatches([client]) || changed;
    }
    this.source.discardAllChanges();
    return changed;
  }

  removeClient(client: Client): void {
    this.views.delete(client);
  }

  dispose(): void {
    this.views.clear();
  }

  private visionFor(client: Client): TeamVision {
    return new TeamVision(this.source.tanks.get(client.sessionId)?.team ?? "", getVisionEntities(this.source));
  }
}
