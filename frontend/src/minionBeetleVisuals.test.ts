import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceBeetleMotion, drawBeetleCannon, drawBeetleHull, drawBeetleLegs, getBeetleLegs } from './minionBeetleVisuals.js';
import type { BeetleMotion } from './minionBeetleVisuals.js';
import type { Drawing } from './wrenchVisuals.js';

const rest: BeetleMotion = { x: 0, y: 0, phase: 0, heading: 0, moving: false };
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('walking phase follows rendered distance, including slower movement', () => {
  const fast = advanceBeetleMotion(rest, { x: 4, y: 0 }, 20);
  const slow = advanceBeetleMotion(rest, { x: 2, y: 0 }, 20);
  assert.ok(fast.moving && slow.moving);
  near(fast.phase, fast.x / 12 * Math.PI * 2);
  near(slow.phase, fast.phase / 2);
  near(slow.x, fast.x / 2);
});

test('diagonal pairs step together and opposing pairs alternate', () => {
  const idle = getBeetleLegs(0, false);
  const stepping = getBeetleLegs(Math.PI / 2, true);
  const offsets = stepping.map((leg, index) => leg.foot.y - idle[index].foot.y);
  assert.deepEqual(offsets, [7, -7, -7, 7]);
  assert.equal(stepping.length, 4);
  for (const leg of stepping) assert.ok(leg.hip.x !== leg.knee.x && leg.knee.x !== leg.foot.x);
  assert.deepEqual(getBeetleLegs(1.7, false), idle, 'stationary pose ignores phase');
});

test('arriving stops the gait, holds heading and snaps the last tiny remainder', () => {
  let motion = advanceBeetleMotion(rest, { x: 10, y: 0 }, 16);
  for (let i = 0; i < 60; i++) motion = advanceBeetleMotion(motion, { x: 10, y: 0 }, 16);
  assert.equal(motion.moving, false);
  assert.equal(motion.x, 10);
  assert.equal(motion.heading, Math.PI / 2);
  assert.deepEqual(advanceBeetleMotion(motion, { x: 10, y: 0 }, 1000), motion);
  const restarted = advanceBeetleMotion(motion, { x: 10, y: -10 }, 16);
  assert.ok(restarted.moving);
  assert.equal(restarted.heading, 0);
});

test('position and gait are frame-rate independent between server updates', () => {
  const target = { x: 10, y: 4 };
  const oneFrame = advanceBeetleMotion(rest, target, 40);
  let fourFrames = rest;
  for (let i = 0; i < 4; i++) fourFrames = advanceBeetleMotion(fourFrames, target, 10);
  near(oneFrame.x, fourFrames.x);
  near(oneFrame.y, fourFrames.y);
  near(oneFrame.phase, fourFrames.phase);
  assert.deepEqual(advanceBeetleMotion(rest, target, 0), rest);
});

test('gait phase stays bounded over long travel and long frames do not overshoot', () => {
  const motion = advanceBeetleMotion(rest, { x: 1000, y: 0 }, 10000);
  assert.ok(motion.x <= 1000 && motion.x > 0);
  assert.ok(motion.phase >= 0 && motion.phase < Math.PI * 2);
});

function recorder() {
  const calls: Array<{ method: string; args: number[] }> = [];
  const record = (method: string, args: number[]) => { calls.push({ method, args }); };
  const graphics: Drawing = {
    clear: () => record('clear', []),
    fillStyle: (...args) => record('fillStyle', args),
    lineStyle: (...args) => record('lineStyle', args),
    fillCircle: (...args) => record('fillCircle', args),
    strokeCircle: (...args) => record('strokeCircle', args),
    fillRoundedRect: () => record('fillRoundedRect', []),
    strokeRoundedRect: () => record('strokeRoundedRect', []),
    lineBetween: (...args) => record('lineBetween', args),
    beginPath: () => record('beginPath', []),
    moveTo: (...args) => record('moveTo', args),
    lineTo: (...args) => record('lineTo', args),
    closePath: () => record('closePath', []),
    fillPath: () => record('fillPath', []),
    strokePath: () => record('strokePath', [])
  };
  return { graphics, calls };
}

for (const color of [0x4d8dff, 0xff4444]) {
  test(`team ${color.toString(16)}: hexagonal hull, ivory visor, rivets and short cannon`, () => {
    const hull = recorder();
    const cannon = recorder();
    drawBeetleHull(hull.graphics, color);
    drawBeetleCannon(cannon.graphics, color);
    for (const { calls } of [hull, cannon]) {
      assert.equal(calls[0].method, 'clear');
      assert.ok(calls.some(c => c.method === 'fillStyle' && c.args[0] === color));
      assert.ok(calls.every(c => c.args.every(Number.isFinite)));
    }
    const firstContour = hull.calls.slice(0, hull.calls.findIndex(c => c.method === 'closePath'));
    assert.equal(firstContour.filter(c => c.method === 'moveTo' || c.method === 'lineTo').length, 6);
    assert.ok(hull.calls.some(c => c.method === 'fillStyle' && c.args[0] === 0xf3f0dc));
    assert.equal(hull.calls.filter(c => c.method === 'fillCircle').length, 2);
    assert.ok(cannon.calls.some(c => c.method === 'moveTo' && c.args[1] === -42));
  });
}

test('four outlined articulated legs change geometry during walking and restore at rest', () => {
  const idle = recorder();
  const walking = recorder();
  const stopped = recorder();
  drawBeetleLegs(idle.graphics, 0, false);
  drawBeetleLegs(walking.graphics, 1, true);
  drawBeetleLegs(stopped.graphics, 1, false);
  assert.equal(idle.calls.filter(c => c.method === 'strokePath').length, 8);
  assert.notDeepEqual(idle.calls, walking.calls);
  assert.deepEqual(idle.calls, stopped.calls);
});

test('walking limbs fit below the health bar at every heading and gait phase', () => {
  for (let step = 0; step < 100; step++) {
    for (const leg of getBeetleLegs(step / 100 * Math.PI * 2, true)) {
      for (const point of [leg.hip, leg.knee, leg.foot]) {
        assert.ok((Math.hypot(point.x, point.y) + 5) * 18 / 82 < 13);
      }
    }
  }
});
