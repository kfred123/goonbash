import type Phaser from 'phaser';
import { getVehicleHeading } from './roleTankVisuals.js';
import { advanceBeetleMotion, drawBeetleCannon, drawBeetleHull, drawBeetleLegs } from './minionBeetleVisuals.js';
import type { BeetleMotion } from './minionBeetleVisuals.js';

export function createMinionBeetle(
  scene: Phaser.Scene, x: number, y: number, teamColor: number, heading: number
) {
  const root = scene.add.container(x, y).setSize(18, 18);
  const scale = 18 / 82;
  const shadow = scene.add.graphics().setScale(scale);
  shadow.fillStyle(0x000000, 0.25);
  shadow.fillRoundedRect(-34, -25, 76, 64, 18);
  const body = scene.add.container(0, 0).setScale(scale).setRotation(heading);
  const legs = scene.add.graphics();
  const hull = scene.add.graphics();
  const cannon = scene.add.graphics().setScale(scale).setRotation(heading);
  drawBeetleLegs(legs, 0, false);
  drawBeetleHull(hull, teamColor);
  drawBeetleCannon(cannon, teamColor);
  body.add([legs, hull]);
  root.add([shadow, body, cannon]);
  let destination = { x, y };
  let motion: BeetleMotion = { x, y, heading, phase: 0, moving: false };

  return Object.assign(root, {
    body, legs, hull, cannon,
    setDestination(x: number, y: number) {
      destination = { x, y };
    },
    updateMotion(deltaMs: number) {
      const next = advanceBeetleMotion(motion, destination, deltaMs);
      if (next.moving || motion.moving) drawBeetleLegs(legs, next.phase, next.moving);
      motion = next;
      root.setPosition(motion.x, motion.y);
      body.rotation = motion.heading;
    },
    aimAt(target: { x: number; y: number } | null) {
      cannon.rotation = getVehicleHeading(root, target, cannon.rotation);
    }
  });
}

export type MinionBeetle = ReturnType<typeof createMinionBeetle>;
