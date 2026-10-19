import type { Drawing } from './wrenchVisuals.js';

const INK = 0x202633;
const CREAM = 0xf3f0dc;
const REPAIR = 0x33cc66;

export function getWorkshopEffectState(dead: boolean, healUntil: number, speedUntil: number, now: number) {
  return { heal: !dead && now < healUntil, speed: !dead && now < speedUntil };
}

export function drawWorkshopEffects(g: Drawing, state: { heal: boolean; speed: boolean }, time: number) {
  g.clear();
  if (state.heal) {
    const radius = 23 + Math.sin(time / 180) * 1.5;
    g.lineStyle(4, INK, 0.65);
    g.strokeCircle(0, 0, radius);
    g.lineStyle(2, REPAIR, 0.9);
    g.strokeCircle(0, 0, radius);
    g.lineStyle(2, CREAM);
    g.lineBetween(-15, -6, -19, -9);
    g.lineBetween(15, -6, 19, -9);
  }
  if (state.speed) {
    const length = 8 + (Math.sin(time / 70) + 1) * 3;
    g.lineStyle(4, INK, 0.7);
    g.lineBetween(-9, 14, -9, 14 + length);
    g.lineBetween(9, 14, 9, 14 + length);
    g.lineStyle(2, CREAM);
    g.lineBetween(-9, 14, -9, 14 + length);
    g.lineBetween(9, 14, 9, 14 + length);
  }
}
