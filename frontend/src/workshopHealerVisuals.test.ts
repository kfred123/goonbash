import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawWorkshopEffects, getWorkshopEffectState } from './workshopHealerVisuals.js';

function recorder() {
  const calls: Array<{ method: string; args: number[] }> = [];
  const record = (method: string, args: number[]) => { calls.push({ method, args }); return graphics; };
  const graphics = {
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

test('replicated effect times are independent, expire exactly and remain off while dead', () => {
  assert.deepEqual(getWorkshopEffectState(false, 0, 0, 100), { heal: false, speed: false });
  assert.deepEqual(getWorkshopEffectState(false, 200, 0, 100), { heal: true, speed: false });
  assert.deepEqual(getWorkshopEffectState(false, 0, 200, 100), { heal: false, speed: true });
  assert.deepEqual(getWorkshopEffectState(false, 200, 300, 100), { heal: true, speed: true });
  assert.deepEqual(getWorkshopEffectState(false, 200, 300, 200), { heal: false, speed: true });
  assert.deepEqual(getWorkshopEffectState(false, 200, 300, 300), { heal: false, speed: false });
  assert.deepEqual(getWorkshopEffectState(true, 200, 300, 100), { heal: false, speed: false });
});

for (const heal of [false, true]) {
  for (const speed of [false, true]) {
    test(`effect drawing: heal=${heal}, speed=${speed}; always clears previous frame`, () => {
      const { graphics, calls } = recorder();
      drawWorkshopEffects(graphics, { heal, speed }, 500);
      assert.deepEqual(calls[0], { method: 'clear', args: [] });
      assert.equal(calls.filter((call) => call.method === 'strokeCircle' || call.method === 'fillCircle').length, 0, 'no surrounding ability circles');
      assert.equal(calls.filter((call) => call.method === 'lineBetween').length, (heal ? 2 : 0) + (speed ? 4 : 0));
      calls.length = 0;
      drawWorkshopEffects(graphics, { heal: false, speed: false }, 600);
      assert.deepEqual(calls, [{ method: 'clear', args: [] }]);
    });
  }
}
