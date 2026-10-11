import type { LobbyTeam, MatchPhase } from "shared";

interface PlayerCombatStats {
  team: string;
  kills: number;
  damageDealt: number;
}

export function recordPlayerDamage(
  stats: PlayerCombatStats | undefined,
  targetTeam: string,
  hpBefore: number,
  hpAfter: number
): number {
  if (!stats || stats.team === targetTeam) return 0;
  const damage = Math.max(0, hpBefore - hpAfter);
  stats.damageDealt += damage;
  return damage;
}

export function recordPlayerKill(stats: PlayerCombatStats | undefined, targetTeam: string): boolean {
  if (!stats || stats.team === targetTeam) return false;
  stats.kills += 1;
  return true;
}

export function getWinnerAfterBaseDestroyed(team: string): "red" | "blue" | null {
  if (team === "red") return "blue";
  if (team === "blue") return "red";
  return null;
}

export function endMatchAfterBaseDestroyed(
  state: { phase: MatchPhase; winnerTeam: LobbyTeam | ""; projectiles: { clear(): void } },
  losingTeam: string
): boolean {
  if (state.phase !== "started") return false;
  const winnerTeam = getWinnerAfterBaseDestroyed(losingTeam);
  if (!winnerTeam) throw new Error(`Cannot determine winner for destroyed base on team "${losingTeam}"`);
  state.winnerTeam = winnerTeam;
  state.phase = "ended";
  state.projectiles.clear();
  return true;
}
