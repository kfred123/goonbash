import type { LobbyTeam, MatchPhase } from "shared";

const MAX_PLAYER_NAME_LENGTH = 20;
const DEFAULT_PLAYER_NAME = "Player";

export function selectBalancedTeam(players: Iterable<{ team: string }>): LobbyTeam {
  let red = 0;
  let blue = 0;
  for (const player of players) {
    if (player.team === "red") red += 1;
    if (player.team === "blue") blue += 1;
  }
  return red <= blue ? "red" : "blue";
}

export function canChangeTeam(phase: MatchPhase, team: unknown): team is LobbyTeam {
  return phase === "waiting" && (team === "red" || team === "blue");
}

export function canManageLobby(phase: MatchPhase, clientSessionId: string, hostSessionId: string): boolean {
  return phase === "waiting" && clientSessionId === hostSessionId;
}

export function normalizeLobbyName(name: unknown): string | undefined {
  if (typeof name !== "string") return undefined;
  const trimmedName = name.trim();
  return trimmedName && trimmedName.length <= 48 ? trimmedName : undefined;
}

export function normalizePlayerName(name: unknown): string {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) return DEFAULT_PLAYER_NAME;
  return trimmedName.length > MAX_PLAYER_NAME_LENGTH
    ? trimmedName.slice(0, MAX_PLAYER_NAME_LENGTH)
    : trimmedName;
}

export function resolveHostAfterLeave(
  leavingSessionId: string,
  currentHostSessionId: string,
  remainingSessionIds: Iterable<string>
): string {
  if (leavingSessionId !== currentHostSessionId) return currentHostSessionId;
  for (const sessionId of remainingSessionIds) {
    return sessionId;
  }
  return "";
}
