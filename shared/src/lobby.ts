export type LobbyStatus = "waiting" | "full" | "countdown";
export type LobbyTeam = "red" | "blue";
export type MatchPhase = "waiting" | "countdown" | "started" | "ended";

export const LOBBY_ACTION_ERROR = "lobby_action_error";
export const LOBBY_NAME_ERROR = "Game name must contain 1 to 48 characters.";
export const COUNTDOWN_DURATION_MS = 5000;

export function normalizeLobbyName(name: unknown): string | undefined {
  if (typeof name !== "string") return undefined;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 48 ? trimmed : undefined;
}

export function isPreMatch(phase: MatchPhase): boolean {
  return phase === "waiting" || phase === "countdown";
}

export function allPlayersReady(players: Iterable<{ ready: boolean }>): boolean {
  let count = 0;
  for (const player of players) {
    if (!player.ready) return false;
    count++;
  }
  return count > 0;
}

export interface LobbyInfo {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: LobbyStatus;
}

export interface LobbyListResponse {
  lobbies: LobbyInfo[];
}

export interface CreateLobbyResponse {
  lobby: LobbyInfo;
}

export interface LobbyErrorResponse {
  error: string;
}