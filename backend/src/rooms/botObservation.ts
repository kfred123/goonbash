import { getVisionEntities, isAbilityId, TeamVision } from "shared";
import type { AbilityId, BotDifficulty, GameState, Tank } from "shared";

export interface BotEntity {
  id: string;
  kind: "tank" | "minion" | "tower" | "base" | "barricade";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  fireRange: number;
  radius?: number;
}

export function isMobileUnit(entity: BotEntity): boolean {
  return entity.kind === "tank" || entity.kind === "minion";
}

export interface BotObservation {
  self: {
    id: string;
    team: string;
    role: string;
    difficulty: BotDifficulty;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    fireRange: number;
    radius: number;
    skillPoints: number;
    abilities: Partial<Record<AbilityId, { level: number; cooldownEndsAt: number }>>;
  };
  allies: BotEntity[];
  enemies: BotEntity[];
}

export function observeBot(state: GameState, bot: Tank): BotObservation {
  if (bot.controllerType !== "bot" || !bot.botDifficulty) throw new Error("Cannot observe for a non-bot tank");
  const vision = new TeamVision(bot.team, getVisionEntities(state));
  const allies: BotEntity[] = [];
  const enemies: BotEntity[] = [];
  const add = (kind: BotEntity["kind"], entity: {
    id: string; team: string; x: number; y: number; hp: number; maxHp: number; fireRange?: number;
    radius?: number; length?: number; state?: string;
  }) => {
    if (entity.hp <= 0 || entity.state === "dead") return;
    if (entity.team !== bot.team && !vision.canSee(entity)) return;
    const snapshot = {
      id: entity.id, kind, x: entity.x, y: entity.y, hp: entity.hp, maxHp: entity.maxHp,
      fireRange: entity.fireRange ?? 0,
      radius: kind === "barricade" && entity.length !== undefined
        ? entity.length / 2 + (entity.radius ?? 0)
        : entity.radius ?? 0
    };
    (entity.team === bot.team ? allies : enemies).push(snapshot);
  };
  state.tanks.forEach(entity => add("tank", entity));
  state.minions.forEach(entity => add("minion", entity));
  state.towers.forEach(entity => add("tower", entity));
  state.bases.forEach(entity => add("base", entity));
  state.barricades.forEach(entity => add("barricade", entity));
  const abilities: BotObservation["self"]["abilities"] = {};
  bot.abilities.forEach((ability, id) => {
    if (isAbilityId(id)) abilities[id] = { level: ability.level, cooldownEndsAt: ability.cooldownEndsAt };
  });
  return {
    self: {
      id: bot.id, team: bot.team, role: bot.role, difficulty: bot.botDifficulty,
      x: bot.x, y: bot.y, hp: bot.hp, maxHp: bot.maxHp, fireRange: bot.fireRange,
      radius: bot.radius, skillPoints: bot.skillPoints, abilities
    },
    allies,
    enemies
  };
}
