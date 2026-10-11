export type SortableMatchStat = "kills" | "level" | "damageDealt";
export type SortDirection = "asc" | "desc";

export interface MatchResultsSort {
  stat: SortableMatchStat;
  direction: SortDirection;
}

export interface MatchResultsPlayer {
  name: string;
  kills: number;
  level: number;
  damageDealt: number;
}

export function nextMatchResultsSort(current: MatchResultsSort, stat: SortableMatchStat): MatchResultsSort {
  if (current.stat === stat) {
    return { stat, direction: current.direction === "desc" ? "asc" : "desc" };
  }
  return { stat, direction: "desc" };
}

export function sortMatchResults<T extends MatchResultsPlayer>(players: T[], sort: MatchResultsSort): T[] {
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...players].sort((a, b) => {
    const difference = a[sort.stat] - b[sort.stat];
    return difference === 0 ? a.name.localeCompare(b.name) : difference * direction;
  });
}
