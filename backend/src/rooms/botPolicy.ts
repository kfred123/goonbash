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
  const command = position ?? (target ? { targetId: target.id } : objective);
  const moving = "targetId" in command ? !isWithinRange(self, target, self.fireRange) : !isWithinRange(self, command, 2);
  return {
    command, upgrade: chooseBotUpgrade(self), ability: chooseBotAbility(observation, ordered, moving, now)
  };
}
