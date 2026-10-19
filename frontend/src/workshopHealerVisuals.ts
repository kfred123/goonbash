import type Phaser from 'phaser';

type Drawing = {
  [Method in 'clear' | 'fillStyle' | 'lineStyle' | 'fillCircle' | 'strokeCircle' |
  'fillRoundedRect' | 'strokeRoundedRect' | 'lineBetween']:
    (...args: Parameters<Phaser.GameObjects.Graphics[Method]>) => void;
};

const INK = 0x202633;
const CREAM = 0xf3f0dc;
const REPAIR = 0x33cc66;

export function drawWorkshopHealer(g: Drawing, teamColor: number, detailed: boolean) {
  g.clear();
  g.fillStyle(0x000000, 0.22);
  g.fillCircle(1, 3, 19);
  g.fillStyle(0x303745);
  g.fillRoundedRect(-20, -12, 9, 26, 4);
  g.fillRoundedRect(11, -12, 9, 26, 4);
  if (detailed) {
    g.lineStyle(1.5, 0x596170);
    for (const y of [-7, -1, 5, 11]) {
      g.lineBetween(-18, y, -13, y);
      g.lineBetween(13, y, 18, y);
    }
    g.fillStyle(CREAM);
    g.fillRoundedRect(-12, 9, 8, 8, 2);
    g.fillRoundedRect(4, 9, 8, 8, 2);
  }
  g.fillStyle(teamColor);
  g.fillCircle(0, 0, 16);
  g.lineStyle(2, INK);
  g.strokeCircle(0, 0, 16);
  g.fillStyle(0x303745);
  g.fillRoundedRect(-5, -21, 10, 10, 2);
  g.fillStyle(CREAM);
  g.fillRoundedRect(-3, -20, 6, 4, 1);
  g.fillRoundedRect(-10, -10, 20, 20, 6);
  g.lineStyle(1.5, INK);
  g.strokeRoundedRect(-10, -10, 20, 20, 6);
  g.lineStyle(3, INK);
  g.lineBetween(-4, 5, 4, -4);
  g.lineBetween(4, -4, 1, -6);
  g.lineBetween(4, -4, 7, -2);
  g.fillStyle(INK);
  g.fillCircle(-4, 5, 2.5);
  if (detailed) {
    g.fillStyle(REPAIR);
    g.fillCircle(0, -13, 2);
  }
}

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
