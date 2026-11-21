import { BLUE_BASE_POSITION, PLAYER_COLLISION_RADIUS, RED_BASE_POSITION } from "shared";
import type { AbilityActivationRequest, AbilityId } from "shared";
import { chooseBotAbility, chooseBotUpgrade } from "./botAbilities.js";
import { isMobileUnit, type BotEntity, type BotObservation } from "./botObservation.js";
import { isWithinRange, type Point } from "./combat.js";

export interface BotDecision {
  command: { targetId: string } | Point;
  upgrade?: AbilityId;
  ability?: AbilityActivationRequest;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const COVER_GAP = 3 * PLAYER_COLLISION_RADIUS;
const PATH_CLEARANCE = 12;

function botObstacleRadius(entity: BotEntity): number {
  if (entity.radius) return entity.radius;
  if (entity.kind === "base") return 48;
  if (entity.kind === "minion") return 11;
  return PLAYER_COLLISION_RADIUS;
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x, dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return distance(point, { x: from.x + t * dx, y: from.y + t * dy });
}

function segmentClearsAllies(from: Point, to: Point, self: BotObservation["self"], allies: BotEntity[]): boolean {
  for (const ally of allies) {
    if (ally.id === self.id) continue;
    const clearance = self.radius + botObstacleRadius(ally) + PATH_CLEARANCE;
    const startDistance = distance(self, ally);
    const endDistance = distance(to, ally);
    const minimumDistance = distanceToSegment(ally, from, to);
    if (endDistance < clearance || (startDistance < clearance
      ? minimumDistance < Math.min(startDistance, endDistance) - 1e-6
      : minimumDistance < clearance)) return false;
  }
  return true;
}

function routeAroundAlly(self: BotObservation["self"], goal: Point, allies: BotEntity[]): Point {
  const dx = goal.x - self.x, dy = goal.y - self.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return goal;
  const ux = dx / length, uy = dy / length;
  const px = -uy, py = ux;
  const blockers = allies.map(entity => {
    const along = (entity.x - self.x) * ux + (entity.y - self.y) * uy;
    const lateral = (entity.x - self.x) * px + (entity.y - self.y) * py;
    const clearance = self.radius + botObstacleRadius(entity) + PATH_CLEARANCE;
    return { entity, along, lateral, clearance };
  }).filter(({ along, lateral, clearance }) => along > 0 && along < length
    && Math.abs(lateral) < clearance)
    .sort((a, b) => a.along - b.along || a.entity.id.localeCompare(b.entity.id));

  for (const { entity, lateral, clearance } of blockers) {
    const preferredSide = Math.abs(lateral) > 1 ? -Math.sign(lateral) : self.team === "blue" ? -1 : 1;
    for (const side of [preferredSide, -preferredSide]) {
      const currentOffset = (self.x - entity.x) * px + (self.y - entity.y) * py;
      const targetOffset = side * (Math.max(Math.abs(currentOffset), clearance) + 24);
      const diversion = {
        x: self.x + px * (targetOffset - currentOffset),
        y: self.y + py * (targetOffset - currentOffset)
      };
      if (segmentClearsAllies(self, diversion, self, allies)) return diversion;
    }
  }
  return goal;
}

function defensivePosition({ self, enemies, allies }: BotObservation): Point | undefined {
  if (self.difficulty === "easy") return;
  const wounded = self.hp <= self.maxHp * (self.difficulty === "hard" ? 0.65 : 0.5);
  if (!wounded && self.role === "tank") return;

  // A distant objective seen by a teammate is not necessarily a threat to this bot.
  let threat: BotEntity | undefined;
  let clearance = 2 * COVER_GAP;
  for (const enemy of enemies) {
    const gap = distance(self, enemy) - enemy.fireRange;
    if (enemy.fireRange > 0 && (gap < clearance || (gap === clearance && (!threat || enemy.id < threat.id)))) {
      threat = enemy;
      clearance = gap;
    }
  }
  if (!threat) return;
  const dx = self.x - threat.x, dy = self.y - threat.y;
  const separation = Math.hypot(dx, dy);
  let cover: Point | undefined;
  let bestTravel = Infinity;
  for (const ally of allies) {
    if (ally.id === self.id || !isMobileUnit(ally) || ally.hp <= ally.maxHp / 2
      || !isWithinRange(self, ally, self.fireRange * 1.5)) continue;
    const ax = ally.x - threat.x, ay = ally.y - threat.y;
    const length = Math.hypot(ax, ay);
    if (length === 0 || ax * dx + ay * dy < 0) continue; // Don't cross the threat to find cover.
    const ux = ax / length, uy = ay / length;
    // Approach one shoulder, not straight through an allied tank's collision body.
    const side = ux * dy - uy * dx >= 0 ? 1 : -1;
    const point = {
      x: ally.x + ux * COVER_GAP - uy * side * PLAYER_COLLISION_RADIUS * 2,
      y: ally.y + uy * COVER_GAP + ux * side * PLAYER_COLLISION_RADIUS * 2
    };
    const standoff = distance(point, threat);
    if (wounded ? standoff < Math.min(separation, threat.fireRange) : standoff > self.fireRange) continue;
    const travel = distance(self, point);
    if (travel < bestTravel) {
      cover = point;
      bestTravel = travel;
    }
  }
  if (cover || !wounded) return cover;

  const safeRange = threat.fireRange + COVER_GAP;
  // Hold inside the wider alert band instead of alternating between retreat and chase every tick.
  if (separation >= safeRange) return { x: self.x, y: self.y };
  const awayX = separation ? dx / separation : (self.team === "blue" ? -1 : 1);
  const awayY = separation ? dy / separation : 0;
  return { x: threat.x + awayX * safeRange, y: threat.y + awayY * safeRange };
}

export function decideBot(observation: BotObservation, now: number): BotDecision {
  const { self, enemies, allies } = observation;
  const priority = (entity: BotEntity) => {
    if (self.difficulty === "easy") return 0;
    if (self.difficulty === "medium") return entity.kind === "base" || entity.kind === "tower" ? -100 : 0;
    const nearbyAllies = allies.filter(ally => distance(ally, entity) < 250).length;
    return (entity.kind === "tank" ? -80 : 0) - nearbyAllies * 30;
  };
  const ordered = enemies.map(entity => ({ entity, score: distance(self, entity) + priority(entity) }))
    .sort((a, b) => a.score - b.score || a.entity.id.localeCompare(b.entity.id)).map(({ entity }) => entity);
  const target = ordered[0];
  const objective = self.team === "blue" ? RED_BASE_POSITION : BLUE_BASE_POSITION;
  const position = defensivePosition(observation);
  const command = position ?? (target ? { targetId: target.id } : routeAroundAlly(self, objective, allies));
  const moving = "targetId" in command ? !isWithinRange(self, target, self.fireRange) : !isWithinRange(self, command, 2);
  return {
    command, upgrade: chooseBotUpgrade(self), ability: chooseBotAbility(observation, ordered, moving, now)
  };
}
