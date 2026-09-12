import type { LobbyTeam, MatchPhase } from "shared";

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
