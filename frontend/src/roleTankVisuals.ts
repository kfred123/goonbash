import type { Role } from 'shared';
import { drawWrench } from './wrenchVisuals.js';
import type { Drawing } from './wrenchVisuals.js';

const INK = 0x172330;
const TRACK = 0x283344;
const CREAM = 0xf3f0dc;

function plate(g: Drawing, points: number[][], color: number, width = 2.5) {
  g.fillStyle(color);
  g.lineStyle(width, INK);
  g.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.closePath();
  g.fillPath();
  g.strokePath();
}

function box(g: Drawing, x: number, y: number, w: number, h: number, color: number, radius = 2) {
  g.fillStyle(color);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, INK);
  g.strokeRoundedRect(x, y, w, h, radius);
}

export function drawRoleChassis(g: Drawing, role: Role, teamColor: number, detailed: boolean) {
  g.clear();
  const heavy = role === 'tank';
  const light = role === 'damagedealer';
  const outer = heavy ? 34 : light ? 24 : 28;
  const trackWidth = heavy ? 18 : light ? 12 : 14;
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(-outer - 2, -29, outer * 2 + 4, 70, 12);
  for (const x of [-outer, outer - trackWidth]) {
    box(g, x, -33, trackWidth, 68, TRACK, 6);
    g.lineStyle(detailed ? 2 : 3, 0x697a8f);
    for (let y = -27; y <= 29; y += detailed ? 7 : 13) {
      g.lineBetween(x + 2, y, x + trackWidth - 2, y);
    }
    if (detailed) {
      g.lineStyle(1, 0xb6c4cf, 0.5);
      g.lineBetween(x + 3, -25, x + 3, 27);
    }
  }
  const half = heavy ? 25 : light ? 17 : 21;
  plate(g, [
    [-half + 8, -32], [half - 8, -32], [half, -20],
    [half, 24], [half - 8, 33], [-half + 8, 33], [-half, 24], [-half, -20]
  ], teamColor);
  g.lineStyle(2, 0xd5e8ff, 0.65);
  g.lineBetween(-half + 9, -26, half - 9, -26);
  g.lineBetween(-half + 4, -18, -half + 4, 16);
  box(g, -half + 6, 23, half * 2 - 12, 6, TRACK, 1);
  if (detailed) {
    g.lineStyle(1.3, 0x8e9eae);
    for (let x = -half + 10; x <= half - 10; x += 5) g.lineBetween(x, 24, x, 28);
    box(g, -half + 2, -25, 5, 6, 0xffe8a0, 1);
    box(g, half - 7, -25, 5, 6, 0xffe8a0, 1);
  }
  if (role === 'healer') {
    for (const x of [-18, 9]) {
      box(g, x, 11, 9, 11, CREAM);
      g.lineStyle(2, 0x388b72);
      g.lineBetween(x + 2, 16, x + 7, 16);
    }
  } else if (heavy) {
    for (const side of [-1, 1]) {
      plate(g, [[side * 26, -23], [side * 17, -18], [side * 17, 18], [side * 26, 25]], teamColor);
      g.lineStyle(1.5, 0xb6d5f6);
      g.lineBetween(side * 25, -13, side * 18, -13);
      if (detailed) g.lineBetween(side * 25, 8, side * 18, 8);
    }
  } else {
    g.lineStyle(3, 0xffdfa0);
    g.lineBetween(-13, 14, -7, 19);
    g.lineBetween(13, 14, 7, 19);
  }
  g.fillStyle(INK);
  g.fillCircle(0, 0, light ? 15 : 18);
  g.fillStyle(0x65798d);
  g.fillCircle(0, -1, light ? 12 : 15);
}

export function drawRoleTurret(g: Drawing, role: Role, teamColor: number, detailed: boolean) {
  g.clear();
  const long = role === 'damagedealer';
  const heavy = role === 'tank';
  const end = long ? -48 : -39;
  box(g, heavy ? -5 : -4, end + 2, heavy ? 10 : 8, -end - 10, 0xc0cfd8, 1);
  box(g, -6, end, 12, long ? 9 : 7, 0x65798d, 1);
  g.lineStyle(2.5, INK);
  g.lineBetween(-3, end + 2, 3, end + 2);
  if (detailed) {
    g.lineStyle(1.4, 0xf7f6e6);
    g.lineBetween(-2, end + 10, -2, -17);
  }
  if (role === 'healer') {
    box(g, -12, -14, 24, 28, CREAM, 6);
    g.fillStyle(0xd2d6c8);
    g.fillRoundedRect(-9, 6, 18, 6, 2);
    drawWrench(g, 0, -1, detailed ? 23 : 25, detailed);
    box(g, -6, 11, 12, 3, 0x55e0a1, 1);
  } else if (heavy) {
    plate(g, [[-10, -19], [10, -19], [19, -7], [15, 12], [0, 19], [-15, 12], [-19, -7]], teamColor, 3);
    plate(g, [[-10, -15], [10, -15], [14, -7], [-14, -7]], 0xabcdee, 1);
    if (detailed) {
      g.lineStyle(3, 0x2b4e7b);
      g.lineBetween(-13, -2, -10, 9);
      g.lineBetween(-10, 9, 0, 14);
      g.lineBetween(0, 14, 10, 9);
      g.lineBetween(10, 9, 13, -2);
    }
    plate(g, [[-6, -5], [0, -7], [6, -5], [6, 1], [0, 7], [-6, 1]], CREAM, 1.5);
  } else {
    box(g, -5, -25, 10, 9, 0x8195a9, 1);
    plate(g, [[-6, -16], [6, -16], [12, -5], [12, 11], [0, 16], [-12, 11], [-12, -5]], teamColor);
    plate(g, [[-5, -12], [5, -12], [8, -6], [-8, -6]], 0xabcdee, 1);
    g.lineStyle(3, 0xffdfa0);
    for (const y of detailed ? [-2, 4] : [2]) {
      g.lineBetween(-6, y, 0, y - 6);
      g.lineBetween(0, y - 6, 6, y);
    }
  }
}

export function getVehicleHeading(origin: { x: number; y: number }, target: { x: number; y: number } | null, previous: number) {
  if (!target || Math.hypot(target.x - origin.x, target.y - origin.y) < 0.05) return previous;
  // Artwork points north; atan2's zero points east.
  return Math.atan2(target.y - origin.y, target.x - origin.x) + Math.PI / 2;
}
