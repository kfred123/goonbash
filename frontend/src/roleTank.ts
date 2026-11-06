import type Phaser from 'phaser';
import type { AbilityId, Role } from 'shared';
import { drawWorkshopEffects, getWorkshopEffectState } from './workshopHealerVisuals.js';
import { drawRoleChassis, drawRoleTurret } from './roleTankVisuals.js';
import { drawScoutOffroadEffects, drawScoutSightEffects, getScoutEffectState } from './scoutVisuals.js';

export function createRoleTank(scene: Phaser.Scene, x: number, y: number, role: Role, size: number, teamColor: number) {
  const root = scene.add.container(x, y).setSize(size, size);
  const effects = scene.add.graphics().setScale(size / (role === 'scout' ? 68 : 40)).clear();
  const chassis = scene.add.graphics().setScale(size / 68);
  const turret = scene.add.graphics().setScale(size / 68);
  const turretEffects = scene.add.graphics().setScale(size / 68);
  drawRoleChassis(chassis, role, teamColor, size > 20);
  drawRoleTurret(turret, role, teamColor, size > 20);
  root.add([effects, chassis, turret, turretEffects]);

  return Object.assign(root, {
    chassis,
    turret,
    effects,
    turretEffects,
    updateAbilityVisuals(dead: boolean, activeUntil: (abilityId: AbilityId) => number, now: number, animationTime: number) {
      if (role === 'healer') {
        effects.rotation = chassis.rotation;
        drawWorkshopEffects(effects, getWorkshopEffectState(
          dead, activeUntil('healer-aura'), activeUntil('healer-speed'), now
        ), animationTime);
      } else if (role === 'scout') {
        const state = getScoutEffectState(dead, activeUntil('scout-weitsicht'), activeUntil('scout-offroad'), now);
        effects.rotation = chassis.rotation;
        turretEffects.rotation = turret.rotation;
        drawScoutOffroadEffects(effects, state.offroad, animationTime);
        drawScoutSightEffects(turretEffects, state.sight, animationTime);
      }
    }
  });
}

export type RoleTank = ReturnType<typeof createRoleTank>;
