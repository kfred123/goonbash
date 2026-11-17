import type { Barricade, TeamVision } from "shared";

export function getBarricadeSegment(
  barricade: Pick<Barricade, "x" | "y" | "angle" | "length">
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const halfLength = barricade.length / 2;
  const dx = Math.cos(barricade.angle) * halfLength;
  const dy = Math.sin(barricade.angle) * halfLength;
  return {
    start: { x: barricade.x - dx, y: barricade.y - dy },
    end: { x: barricade.x + dx, y: barricade.y + dy }
  };
}

export function isBarricadePresented(
  barricade: Pick<Barricade, "team" | "x" | "y">,
  team: string,
  vision: Pick<TeamVision, "canSee">
): boolean {
  return barricade.team === team || vision.canSee(barricade);
}
