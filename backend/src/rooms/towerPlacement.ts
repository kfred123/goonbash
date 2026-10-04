import { getLaneWaypoints, LanePoint, pointAlongPath } from "shared";

export interface LaneTowerPlacement extends LanePoint {
  team: "blue" | "red";
  laneIndex: number;
  towerIndex: number;
}

export function getLaneTowerPlacements(blueBase: LanePoint, redBase: LanePoint): LaneTowerPlacement[] {
  const placements: LaneTowerPlacement[] = [];
  const lanePaths = getLaneWaypoints(blueBase, redBase);
  for (let laneIndex = 0; laneIndex < lanePaths.length; laneIndex += 1) {
    const blueToRedPath = lanePaths[laneIndex];
    for (const team of ["blue", "red"] as const) {
      const path = team === "blue" ? blueToRedPath : [...blueToRedPath].reverse();
      for (const [towerIndex, fraction] of [0.2, 0.4].entries()) {
        placements.push({
          ...pointAlongPath(path, fraction),
          team,
          laneIndex,
          towerIndex
        });
      }
    }
  }
  return placements;
}
