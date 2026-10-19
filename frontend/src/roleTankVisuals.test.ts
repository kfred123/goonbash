import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Role } from 'shared';
import { drawRoleChassis, drawRoleTurret, getVehicleHeading } from './roleTankVisuals.js';
import { drawWrench } from './wrenchVisuals.js';
import type { Drawing } from './wrenchVisuals.js';

function recorder() {
  const calls: Array<{ method: string; args: number[] }> = [];
  const record = (method: string, args: number[]) => { calls.push({ method, args }); };
  const graphics: Drawing = {
    clear: () => record('clear', []),
    fillStyle: (...args: number[]) => record('fillStyle', args),
    lineStyle: (...args: number[]) => record('lineStyle', args),
    fillCircle: (...args: number[]) => record('fillCircle', args),
    strokeCircle: (...args: number[]) => record('strokeCircle', args),
    fillRoundedRect: (...args: number[]) => record('fillRoundedRect', args),
    strokeRoundedRect: (...args: number[]) => record('strokeRoundedRect', args),
    lineBetween: (...args: number[]) => record('lineBetween', args),
    beginPath: () => record('beginPath', []),
    moveTo: (...args: number[]) => record('moveTo', args),
    lineTo: (...args: number[]) => record('lineTo', args),
    closePath: () => record('closePath', []),
    fillPath: () => record('fillPath', []),
    strokePath: () => record('strokePath', [])
  };
  return { graphics, calls };
}

for (const role of ['healer', 'tank', 'damagedealer'] satisfies Role[]) {
  for (const teamColor of [0x4d8dff, 0xff4444]) {
    for (const detailed of [true, false]) {
      test(`${role}, team ${teamColor.toString(16)}, detailed=${detailed}: tracks, team hull and separate cannon`, () => {
        const chassis = recorder();
        const turret = recorder();
        drawRoleChassis(chassis.graphics, role, teamColor, detailed);
        drawRoleTurret(turret.graphics, role, teamColor, detailed);
        assert.equal(chassis.calls[0].method, 'clear');
        assert.equal(turret.calls[0].method, 'clear');
        assert.ok(chassis.calls.some(c => c.method === 'fillStyle' && c.args[0] === teamColor));
        const tracks = chassis.calls.filter(c => c.method === 'fillRoundedRect' && c.args[3] === 68);
        assert.equal(tracks.length, 2);
        assert.ok(tracks[0].args[0] < 0 && tracks[1].args[0] > 0);
        const expectedSpan = role === 'tank' ? 68 : role === 'healer' ? 56 : 48;
        assert.equal(tracks[1].args[0] + tracks[1].args[2] - tracks[0].args[0], expectedSpan);
        assert.ok(turret.calls.some(c => c.method === 'fillRoundedRect' && c.args[1] === (role === 'damagedealer' ? -48 : -39)), 'visible cannon muzzle');
        assert.ok(turret.calls.some(c => c.method === 'fillStyle' && c.args[0] === 0xc0cfd8), 'metal barrel');
        if (role === 'healer') assert.equal(turret.calls.filter(c => c.method === 'strokeCircle').length, 2, 'shared hollow-ring wrench');
      });
    }
  }
  test(`${role}: lobby keeps geometry while reducing detail`, () => {
    const full = recorder();
    const small = recorder();
    drawRoleChassis(full.graphics, role, 0x4d8dff, true);
    drawRoleTurret(full.graphics, role, 0x4d8dff, true);
    drawRoleChassis(small.graphics, role, 0x4d8dff, false);
    drawRoleTurret(small.graphics, role, 0x4d8dff, false);
    assert.ok(small.calls.length < full.calls.length);
  });
}

test('north-facing artwork aims in all cardinal directions and holds its last idle heading', () => {
  const origin = { x: 100, y: 100 };
  assert.equal(getVehicleHeading(origin, { x: 100, y: 0 }, 2), 0);
  assert.equal(getVehicleHeading(origin, { x: 200, y: 100 }, 2), Math.PI / 2);
  assert.equal(getVehicleHeading(origin, { x: 100, y: 200 }, 2), Math.PI);
  assert.equal(getVehicleHeading(origin, { x: 0, y: 100 }, 2), Math.PI * 1.5);
  assert.equal(getVehicleHeading(origin, null, 2), 2);
  assert.equal(getVehicleHeading(origin, origin, 2), 2);
  assert.equal(getVehicleHeading(origin, { x: 100.01, y: 100 }, 2), 2);
});

for (const size of [12, 22, 30]) {
  test(`wrench at ${size}px: real open jaws, solid shaft and transparent ring`, () => {
    const { graphics, calls } = recorder();
    drawWrench(graphics, 37, 51, size, size > 12);
    const ringStrokes = calls.filter(c => c.method === 'strokeCircle');
    assert.equal(ringStrokes.length, 2);
    assert.equal(calls.filter(c => c.method === 'fillCircle').length, 0, 'ring hole is not painted');
    assert.ok(ringStrokes[0].args[2] > 0);
    const contour = calls.filter(c => c.method === 'moveTo' || c.method === 'lineTo').map(c => c.args);
    const transformed = (x: number, y: number) => [
      37 + (x - y) * Math.SQRT1_2 * size / 36,
      51 + (x + y) * Math.SQRT1_2 * size / 36
    ];
    const inside = ([x, y]: number[]) => {
      let result = false;
      for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
        const [xi, yi] = contour[i];
        const [xj, yj] = contour[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
      }
      return result;
    };
    assert.equal(inside(transformed(0, -10)), false, 'open mouth');
    assert.equal(inside(transformed(-5, -8)), true, 'left jaw');
    assert.equal(inside(transformed(5, -8)), true, 'right jaw');
    assert.equal(inside(transformed(0, 2)), true, 'solid handle');
    assert.equal(inside(transformed(0, 12)), false, 'ring center is outside handle');
  });
}
