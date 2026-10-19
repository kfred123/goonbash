import type Phaser from 'phaser';
import { drawWorkshopEffects, drawWorkshopHealer, getWorkshopEffectState } from './workshopHealerVisuals.js';

export function createWorkshopHealer(scene: Phaser.Scene, x: number, y: number, size: number, teamColor: number) {
  const root = scene.add.container(x, y).setSize(size, size);
  const effects = scene.add.graphics().setScale(size / 40).clear();
  const body = scene.add.graphics().setScale(size / 40);
  const outline = scene.add.circle(0, 0, size / 2 + 1, 0, 0);
  drawWorkshopHealer(body, teamColor, size > 20);
  root.add([effects, body, outline]);

  return Object.assign(root, {
    setStrokeStyle(width: number, color: number) {
      outline.setStrokeStyle(width, color);
      return root;
    },
    updateAbilityVisuals(dead: boolean, healUntil: number, speedUntil: number, now: number, animationTime: number) {
      drawWorkshopEffects(effects, getWorkshopEffectState(dead, healUntil, speedUntil, now), animationTime);
    }
  });
}

export type WorkshopHealer = ReturnType<typeof createWorkshopHealer>;
