import type Phaser from 'phaser';
import type { Role } from 'shared';
import { drawWorkshopEffects, getWorkshopEffectState } from './workshopHealerVisuals.js';
import { drawRoleChassis, drawRoleTurret } from './roleTankVisuals.js';

export function createRoleTank(scene: Phaser.Scene, x: number, y: number, role: Role, size: number, teamColor: number) {
  const root = scene.add.container(x, y).setSize(size, size);
  const effects = scene.add.graphics().setScale(size / 40).clear();
  const chassis = scene.add.graphics().setScale(size / 68);
  const turret = scene.add.graphics().setScale(size / 68);
  const defense = scene.add.circle(0, 0, size * 0.59, 0, 0).setStrokeStyle(7, 0x101720).setVisible(false);
  const outline = scene.add.circle(0, 0, size * 0.66, 0, 0);
  drawRoleChassis(chassis, role, teamColor, size > 20);
  drawRoleTurret(turret, role, teamColor, size > 20);
  root.add([effects, defense, chassis, turret, outline]);

  return Object.assign(root, {
    chassis,
    turret,
    effects,
    defense,
    outline,
    setStrokeStyle(width: number, color: number) {
      outline.setStrokeStyle(width, color);
      return root;
    },
    setDefensiveState(active: boolean) {
      defense.setVisible(active);
    },
    updateAbilityVisuals(dead: boolean, healUntil: number, speedUntil: number, now: number, animationTime: number) {
      if (role === 'healer') {
        effects.rotation = chassis.rotation;
        drawWorkshopEffects(effects, getWorkshopEffectState(dead, healUntil, speedUntil, now), animationTime);
      }
    }
  });
}

export type RoleTank = ReturnType<typeof createRoleTank>;
