import type { Barricade, TeamVision } from "shared";
import type { Drawing } from "./wrenchVisuals.js";

export function drawBarricade(
  g: Pick<Drawing, "lineStyle" | "lineBetween" | "fillStyle" | "fillCircle">,
  length: number,
  teamColor: number
): void {
  const count = Math.max(1, Math.floor(length / 22));
  const spacing = length / count;
  const arm = Math.min(7, spacing / 2 - 2.5);

  g.lineStyle(2, teamColor, 0.9);
  g.lineBetween(-length / 2, 8.5, length / 2, 8.5);
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + (i + 0.5) * spacing;
    g.lineStyle(5, 0x26373c);
    g.lineBetween(x - arm, -arm, x + arm, arm);
    g.lineBetween(x + arm, -arm, x - arm, arm);
    g.lineStyle(3, 0x75898d);
    g.lineBetween(x - arm, -arm, x + arm, arm);
    g.lineStyle(3, 0xa2b1b1);
    g.lineBetween(x + arm, -arm, x - arm, arm);
    g.fillStyle(0xd0dada);
    g.fillCircle(x, 0, 1.5);
  }
}

export function isBarricadePresented(
  barricade: Pick<Barricade, "team" | "x" | "y">,
  team: string,
  vision: Pick<TeamVision, "canSee">
): boolean {
  return barricade.team === team || vision.canSee(barricade);
}
