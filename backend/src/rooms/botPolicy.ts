import { BLUE_BASE_POSITION, MAX_ABILITY_LEVEL, RED_BASE_POSITION } from "shared";
import type { AbilityId } from "shared";
import type { BotEntity, BotObservation } from "./botObservation.js";

export interface BotDecision {
  command: { targetId: string } | { x: number; y: number };
  upgrade?: AbilityId;
  ability?: AbilityId;
}

const primaryAbility: Record<string, AbilityId> = {
  healer: "healer-aura",
  tank: "tank-shield",
  damagedealer: "damagedealer-rapidfire",
  scout: "scout-weitsicht"
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function decideBot(observation: BotObservation, now: number): BotDecision {
  const { self, enemies, allies } = observation;
  const ordered = [...enemies].sort((a, b) => {
    const priority = (entity: BotEntity) => {
      if (self.difficulty === "easy") return 0;
      if (self.difficulty === "medium") return entity.kind === "base" || entity.kind === "tower" ? -100 : 0;
      const nearbyAllies = allies.filter(ally => distance(ally, entity) < 250).length;
      return (entity.kind === "tank" ? -80 : 0) - nearbyAllies * 30;
    };
    return distance(self, a) + priority(a) - distance(self, b) - priority(b) || a.id.localeCompare(b.id);
  });
  const target = ordered[0];
  const objective = self.team === "blue" ? RED_BASE_POSITION : BLUE_BASE_POSITION;
  const abilityId = primaryAbility[self.role];
  const ability = abilityId ? self.abilities[abilityId] : undefined;
  const decision: BotDecision = {
    command: target ? { targetId: target.id } : { x: objective.x, y: objective.y }
  };
  if (abilityId && ability && self.skillPoints > 0 && ability.level < MAX_ABILITY_LEVEL) decision.upgrade = abilityId;
  const nearbyThreat = enemies.some(enemy => distance(self, enemy) <= self.fireRange * 1.5);
  const woundedAlly = allies.some(ally => distance(self, ally) <= 120 && ally.hp < ally.maxHp * 0.8);
  const shouldUse = self.role === "healer" ? woundedAlly
    : self.role === "tank" ? nearbyThreat && self.hp < self.maxHp * 0.8
    : self.role === "damagedealer" ? nearbyThreat
    : self.role === "scout" && (nearbyThreat || self.difficulty !== "easy");
  if (abilityId && ability && ability.level > 0 && now >= ability.cooldownEndsAt && shouldUse) {
    decision.ability = abilityId;
  }
  return decision;
}
