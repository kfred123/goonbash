import type { Drawing } from './wrenchVisuals.js';
import { getVehicleHeading } from './roleTankVisuals.js';

const INK = 0x172330;
const METAL = 0x8c9eaa;
const CREAM = 0xf3f0dc;
const CYCLE_DISTANCE = 12;
const TAU = Math.PI * 2;

export type BeetleMotion = {
  x: number;
  y: number;
  heading: number;
  phase: number;
  moving: boolean;
};

export function advanceBeetleMotion(
  motion: BeetleMotion, destination: { x: number; y: number }, deltaMs: number
): BeetleMotion {
  if (deltaMs <= 0) return motion;
  const distance = Math.hypot(destination.x - motion.x, destination.y - motion.y);
  if (distance <= 0.05) {
    return { ...motion, ...destination, moving: false };
  }
  const fraction = 1 - Math.exp(-deltaMs / 45);
  const travelled = distance * fraction;
  return {
    x: motion.x + (destination.x - motion.x) * fraction,
    y: motion.y + (destination.y - motion.y) * fraction,
    heading: getVehicleHeading(motion, destination, motion.heading),
    phase: (motion.phase + travelled / CYCLE_DISTANCE * TAU) % TAU,
    moving: true
  };
}

export function getBeetleLegs(phase: number, moving: boolean) {
  return [-1, 1].flatMap(side => [-1, 1].map(end => {
    const stride = moving ? Math.sin(phase) * side * end * 7 : 0;
    return {
      hip: { x: side * 17, y: end * 14 },
      knee: { x: side * (31 + (moving ? Math.cos(phase) * side * end * 2 : 0)), y: end * 23 + stride / 2 },
      foot: { x: side * (end < 0 ? 36 : 29), y: (end < 0 ? -10 : 33) + stride }
    };
  }));
}

function plate(g: Drawing, points: number[][], color: number, width = 3) {
  g.fillStyle(color);
  g.lineStyle(width, INK);
  g.beginPath();
  points.forEach(([x, y], index) => index === 0 ? g.moveTo(x, y) : g.lineTo(x, y));
  g.closePath();
  g.fillPath();
  g.strokePath();
}

export function drawBeetleLegs(g: Drawing, phase: number, moving: boolean) {
  g.clear();
  const legs = getBeetleLegs(phase, moving);
  for (const [width, color] of [[10, INK], [4, METAL]]) {
    g.lineStyle(width, color);
    for (const { hip, knee, foot } of legs) {
      g.beginPath();
      g.moveTo(hip.x, hip.y);
      g.lineTo(knee.x, knee.y);
      g.lineTo(foot.x, foot.y);
      g.strokePath();
    }
  }
}

export function drawBeetleHull(g: Drawing, teamColor: number) {
  g.clear();
  plate(g, [[-12, -29], [12, -29], [24, 0], [12, 29], [-12, 29], [-24, 0]], teamColor);
  g.lineStyle(2, 0xd9ecff);
  g.lineBetween(-9, -23, 9, -23);
  g.lineBetween(-17, -5, -13, 13);
  plate(g, [[-15, -18], [15, -18], [15, -9], [-15, -9]], CREAM, 2);
  g.lineStyle(2, 0x394f60);
  g.lineBetween(-10, -13, 10, -13);
  for (const x of [-12, 12]) {
    g.fillStyle(CREAM);
    g.fillCircle(x, 19, 3);
    g.lineStyle(1.5, INK);
    g.strokeCircle(x, 19, 3);
  }
}

export function drawBeetleCannon(g: Drawing, teamColor: number) {
  g.clear();
  plate(g, [[-4, -38], [4, -38], [4, 2], [-4, 2]], 0xb5c6d0, 2.5);
  plate(g, [[-6, -42], [6, -42], [6, -35], [-6, -35]], 0x667d8e, 2);
  plate(g, [[-11, -3], [11, -3], [14, 9], [8, 17], [-8, 17], [-14, 9]], teamColor);
  g.lineStyle(3, 0xd6e7f3);
  g.lineBetween(0, 1, 0, 12);
}
