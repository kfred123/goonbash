import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawWorkshopEffects, drawWorkshopHealer, getWorkshopEffectState } from './workshopHealerVisuals.js';

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
    lineBetween: (...args: number[]) => record('lineBetween', args)
  };
  return { graphics, calls };
}

for (const teamColor of [0x4d8dff, 0xff4444]) {
  test(`workshop hull uses team paint ${teamColor.toString(16)} and round repair identity`, () => {
    const { graphics, calls } = recorder();
    drawWorkshopHealer(graphics, teamColor, true);
    const paintIndex = calls.findIndex((call) => call.method === 'fillStyle' && call.args[0] === teamColor);
    assert.ok(paintIndex >= 0);
    assert.deepEqual(calls[paintIndex + 1], { method: 'fillCircle', args: [0, 0, 16] });
    assert.ok(calls.some((call) => call.method === 'fillRoundedRect' && call.args[0] === -20), 'left track');
    assert.ok(calls.some((call) => call.method === 'fillRoundedRect' && call.args[0] === 11), 'right track');
    assert.ok(calls.some((call) => call.method === 'fillRoundedRect' && call.args[1] === -21), 'nozzle');
    assert.ok(calls.some((call) => call.method === 'lineBetween' && call.args.join() === '-4,5,4,-4'), 'wrench');
  });
}

test('lobby drawing keeps hull, tracks, cover and wrench but omits fine details', () => {
  const full = recorder();
  const small = recorder();
  drawWorkshopHealer(full.graphics, 0x4d8dff, true);
  drawWorkshopHealer(small.graphics, 0x4d8dff, false);
  assert.ok(small.calls.length < full.calls.length);
  assert.equal(small.calls.filter((call) => call.method === 'fillRoundedRect').length, 5);
  assert.ok(small.calls.some((call) => call.method === 'lineBetween' && call.args.join() === '-4,5,4,-4'));
  assert.ok(!small.calls.some((call) => call.method === 'fillStyle' && call.args[0] === 0x33cc66), 'no tiny status light');
});

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
      assert.equal(calls.filter((call) => call.method === 'strokeCircle').length, heal ? 2 : 0);
      assert.equal(calls.filter((call) => call.method === 'lineBetween').length, (heal ? 2 : 0) + (speed ? 4 : 0));
      calls.length = 0;
      drawWorkshopEffects(graphics, { heal: false, speed: false }, 600);
      assert.deepEqual(calls, [{ method: 'clear', args: [] }]);
    });
  }
}
