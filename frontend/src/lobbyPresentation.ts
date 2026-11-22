import { allPlayersReady } from "shared";
import type { BotDifficulty, GameState, LobbyTeam, Role } from "shared";

export const LOBBY_CAPACITY = 10;
export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ["easy", "medium", "hard"];

export interface BotDraft {
  team: LobbyTeam;
  role: Role;
  difficulty: BotDifficulty;
}

export function newBotDraft(team: LobbyTeam): BotDraft {
  return { team, role: "damagedealer", difficulty: "medium" };
}

export function getBotAddRequest(state: GameState, sessionId: string, draft: BotDraft) {
  return canManageBots(state, sessionId) && state.tanks.size < LOBBY_CAPACITY ? { ...draft } : null;
}

export function getBotMoveRequest(state: GameState, sessionId: string, botId: string) {
  const bot = state.tanks.get(botId);
  if (!canManageBots(state, sessionId) || !bot || bot.controllerType !== "bot") return null;
  return { botId, team: bot.team === "red" ? "blue" as const : "red" as const };
}

export function getBotRemoveRequest(state: GameState, sessionId: string, botId: string) {
  const bot = state.tanks.get(botId);
  return canManageBots(state, sessionId) && bot?.controllerType === "bot" ? botId : null;
}

export function getLobbyControls(state: GameState, sessionId: string) {
  const player = state.tanks.get(sessionId);
  const waiting = state.phase === "waiting";
  const isHost = state.hostSessionId === sessionId;
  return {
    isHost,
    canChoose: waiting && !!player && !player.ready,
    canReady: waiting && !!player,
    canStart: waiting && !!player && isHost && allPlayersReady(state.tanks.values())
  };
}

export function canManageBots(state: GameState, sessionId: string): boolean {
  const player = state.tanks.get(sessionId);
  return state.phase === "waiting" && state.hostSessionId === sessionId && player?.controllerType === "human";
}
