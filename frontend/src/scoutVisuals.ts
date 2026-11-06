import type { Drawing } from './wrenchVisuals.js';

const INK = 0x172330;
const TIRE = 0x262d36;
const GOLD = 0xe7bd45;
const LENS = 0x6fd3ff;
const METAL = 0xc0cfd8;
const SHOCK = 0x72e8ff;
const GRASS = 0x7bd36a;

function box(g: Drawing, x: number, y: number, w: number, h: number, color: number, radius = 2) {
  g.fillStyle(color);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, INK);
  g.strokeRoundedRect(x, y, w, h, radius);
}

function polygon(g: Drawing, points: number[][], color: number, width = 2.5) {
  g.fillStyle(color);
  g.lineStyle(width, INK);
  g.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
  g.fillPath();
  g.strokePath();
}

export const SCOUT_WHEEL_HEIGHT = 22;
export const SCOUT_EMITTER_TIP_Y = -36;

/** Slim off-road buggy: four chunky tires instead of tracks and a golden scout stripe. */
export function drawScoutChassis(g: Drawing, teamColor: number, detailed: boolean) {
  g.clear();
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(-31, -30, 62, 68, 12);
  g.lineStyle(4, INK);
  g.lineBetween(-22, -19, 22, -19);
  g.lineBetween(-22, 21, 22, 21);
  for (const x of [-31, 18]) {
    for (const y of [-30, 10]) {
      box(g, x, y, 13, SCOUT_WHEEL_HEIGHT, TIRE, 5);
      g.lineStyle(detailed ? 2 : 3, 0x697a8f);
      for (let tread = y + 4; tread < y + SCOUT_WHEEL_HEIGHT - 2; tread += detailed ? 4 : 8) {
        g.lineBetween(x + 2, tread, x + 11, tread);
      }
      if (detailed) box(g, x + 4, y + 8, 5, 6, GOLD, 1);
    }
  }
  polygon(g, [[-8, -35], [8, -35], [16, -22], [16, 24], [9, 33], [-9, 33], [-16, 24], [-16, -22]], teamColor);
  box(g, -3, -30, 6, 58, GOLD, 1);
  g.lineStyle(2, 0xd5e8ff, 0.65);
  g.lineBetween(-12, -20, -12, 18);
  if (detailed) {
    g.lineStyle(2.5, GOLD);
    g.lineBetween(9, 8, 5, 15);
    g.lineBetween(5, 15, 10, 15);
    g.lineBetween(10, 15, 6, 22);
    box(g, -14, -27, 4, 5, 0xffe8a0, 1);
    box(g, 10, -27, 4, 5, 0xffe8a0, 1);
  }
  g.fillStyle(INK);
  g.fillCircle(0, 0, 15);
  g.fillStyle(0x65798d);
  g.fillCircle(0, -1, 12);
}

/** Double binocular turret with a small shock emitter mounted between the tubes. */
export function drawScoutTurret(g: Drawing, teamColor: number, detailed: boolean) {
  g.clear();
  box(g, -2, SCOUT_EMITTER_TIP_Y + 2, 4, -SCOUT_EMITTER_TIP_Y - 12, METAL, 1);
  g.fillStyle(SHOCK);
  g.fillCircle(0, SCOUT_EMITTER_TIP_Y + 1, 3);
  g.lineStyle(1.5, INK);
  g.strokeCircle(0, SCOUT_EMITTER_TIP_Y + 1, 3);
  box(g, -13, -8, 26, 20, teamColor, 6);
  for (const x of [-15, 5]) {
    box(g, x, -27, 10, 22, 0x2b4e7b, 3);
    box(g, x - 1, -29, 12, 6, GOLD, 2);
    g.fillStyle(LENS);
    g.fillCircle(x + 5, -26, 3.5);
    if (detailed) {
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x + 4, -27, 1.2);
      g.lineStyle(1.2, GOLD);
      g.lineBetween(x + 2, -15, x + 8, -15);
    }
  }
  g.fillStyle(GOLD);
  g.fillCircle(0, -12, 4);
  g.lineStyle(1.5, INK);
  g.strokeCircle(0, -12, 4);
  if (detailed) {
    g.lineStyle(2.5, GOLD);
    g.lineBetween(-4, 2, 1, -3);
    g.lineBetween(1, -3, -1, 3);
    g.lineBetween(-1, 3, 4, -2);
  }
}

export function getScoutEffectState(dead: boolean, sightUntil: number, offroadUntil: number, now: number) {
  return { sight: !dead && now < sightUntil, offroad: !dead && now < offroadUntil };
}

/** Grass and dust thrown back from the rear tires while Offroad is active (chassis coordinates). */
export function drawScoutOffroadEffects(g: Drawing, active: boolean, time: number) {
  g.clear();
  if (!active) return;
  for (const x of [-25, 25]) {
    const length = 9 + (Math.sin(time / 60 + (x > 0 ? 1.7 : 0)) + 1) * 4;
    g.lineStyle(3, GRASS, 0.85);
    g.lineBetween(x, 33, x - 4, 33 + length);
    g.lineBetween(x, 33, x + 4, 33 + length * 0.8);
    g.fillStyle(0xb79a6b, 0.45);
    g.fillCircle(x, 36 + length * 0.6, 3 + length * 0.15);
  }
}

/** Lens glints and forward sight rays while Weitsicht is active (turret coordinates). */
export function drawScoutSightEffects(g: Drawing, active: boolean, time: number) {
  g.clear();
  if (!active) return;
  const pulse = (Math.sin(time / 140) + 1) / 2;
  for (const x of [-10, 10]) {
    g.lineStyle(2, 0xfff3b0, 0.35 + pulse * 0.45);
    g.lineBetween(x, -30, x * 1.8, -50 - pulse * 8);
    g.lineBetween(x, -30, x * 0.4, -52 - pulse * 8);
    g.fillStyle(0xffffff, 0.6 + pulse * 0.4);
    g.fillCircle(x, -27, 2 + pulse * 1.5);
  }
}

export function drawBinocularIcon(g: Drawing, cx: number, cy: number, size: number) {
  const r = size * 0.18;
  g.lineStyle(3, 0xffffff);
  g.lineBetween(cx - r, cy - r, cx + r, cy - r);
  for (const side of [-1, 1]) {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(cx + side * size * 0.24 - r, cy - size * 0.3, r * 2, size * 0.42, 3);
    g.fillStyle(LENS);
    g.fillCircle(cx + side * size * 0.24, cy + size * 0.18, r * 1.05);
    g.lineStyle(2, 0xffffff);
    g.strokeCircle(cx + side * size * 0.24, cy + size * 0.18, r * 1.05);
  }
}

export function drawOffroadIcon(g: Drawing, cx: number, cy: number, size: number) {
  const r = size * 0.22;
  g.lineStyle(3, 0xffffff);
  g.strokeCircle(cx, cy - size * 0.05, r);
  g.fillStyle(0xffffff);
  g.fillCircle(cx, cy - size * 0.05, r * 0.35);
  g.lineStyle(3, GRASS);
  for (const offset of [-0.32, -0.12, 0.12, 0.32]) {
    const x = cx + offset * size;
    g.lineBetween(x, cy + size * 0.42, x + offset * 6, cy + size * 0.22);
  }
}

export function drawShockIcon(g: Drawing, cx: number, cy: number, size: number) {
  g.fillStyle(SHOCK);
  g.beginPath();
  g.moveTo(cx + size * 0.1, cy - size * 0.45);
  g.lineTo(cx - size * 0.28, cy + size * 0.05);
  g.lineTo(cx - size * 0.02, cy + size * 0.05);
  g.lineTo(cx - size * 0.12, cy + size * 0.45);
  g.lineTo(cx + size * 0.28, cy - size * 0.08);
  g.lineTo(cx + size * 0.02, cy - size * 0.08);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0xffffff);
  g.strokePath();
}
