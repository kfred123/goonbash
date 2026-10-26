import type { LobbyTeam, MatchPhase, Role } from "shared";
import { isRole } from "shared";

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

export function canChangeTeam(phase: MatchPhase, team: unknown, ready: boolean): team is LobbyTeam {
  return phase === "waiting" && !ready && (team === "red" || team === "blue");
}

export function canUseGameplayActions(phase: MatchPhase): boolean {
  return phase === "started";
}

export function canJoinRoom(phase: MatchPhase): boolean {
  return phase === "waiting" || phase === "started";
}

export function canChangeRole(phase: MatchPhase, role: unknown, ready: boolean): role is Role {
  return phase === "waiting" && !ready && isRole(role);
}

export function canManageLobby(phase: MatchPhase, clientSessionId: string, hostSessionId: string): boolean {
  return phase === "waiting" && clientSessionId === hostSessionId;
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
