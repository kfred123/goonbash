import {
  getLaneWaypoints, isPointOnLane, LanePoint, LANE_BORDER_WIDTH,
  samplePathWithTangent, TOWER_FOOTPRINT_RADIUS, WORLD_HEIGHT, WORLD_WIDTH
} from "shared";

export const TOWER_GRASS_GAP = 4;
export const TOWER_LATERAL_OFFSET = LANE_BORDER_WIDTH / 2 + TOWER_FOOTPRINT_RADIUS + TOWER_GRASS_GAP;

export interface LaneTowerPlacement extends LanePoint {
  team: "blue" | "red";
  laneIndex: number;
  towerIndex: number;
  side: "left" | "right";
}

export function getLaneTowerPlacements(blueBase: LanePoint, redBase: LanePoint): LaneTowerPlacement[] {
  const placements: LaneTowerPlacement[] = [];
  const lanePaths = getLaneWaypoints(blueBase, redBase);
  for (let laneIndex = 0; laneIndex < lanePaths.length; laneIndex += 1) {
    const blueToRedPath = lanePaths[laneIndex];
    for (const team of ["blue", "red"] as const) {
      for (const [towerIndex, fraction] of [0.2, 0.4].entries()) {
        const { point, tangent } = samplePathWithTangent(blueToRedPath, team === "blue" ? fraction : 1 - fraction);
        for (const side of ["left", "right"] as const) {
          const offset = (side === "left" ? -1 : 1) * TOWER_LATERAL_OFFSET;
          const placement: LaneTowerPlacement = {
            x: point.x - tangent.y * offset,
            y: point.y + tangent.x * offset,
            team, laneIndex, towerIndex, side
          };
          if (placement.x - TOWER_FOOTPRINT_RADIUS < 0 || placement.x + TOWER_FOOTPRINT_RADIUS > WORLD_WIDTH
            || placement.y - TOWER_FOOTPRINT_RADIUS < 0 || placement.y + TOWER_FOOTPRINT_RADIUS > WORLD_HEIGHT
            || isPointOnLane(placement, lanePaths, LANE_BORDER_WIDTH + 2 * TOWER_FOOTPRINT_RADIUS)) {
            throw new Error(`Lane tower footprint is not on in-bounds grass: ${team}/${laneIndex}/${towerIndex}/${side}`);
          }
          placements.push(placement);
        }
      }
    }
  }
  return placements;
}
