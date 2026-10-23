import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBaseCannonRotation, getBaseCannonShotFeedback } from './baseCannonVisuals.js';

test('base cannon rotation faces its replicated target position', () => {
  const origin = { x: 100, y: 100 };

  assert.equal(getBaseCannonRotation('blue', origin, { x: 200, y: 100 }), 0);
  assert.equal(getBaseCannonRotation('red', origin, { x: 100, y: 0 }), -Math.PI / 2);
});

test('base feedback follows the enlarged muzzle in every direction', () => {
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]) {
    const feedback = getBaseCannonShotFeedback({ x: 240, y: 900, shotCount: 2, shotAngle: angle }, 1);
    assert.ok(feedback);
    assert.ok(Math.abs(feedback.muzzle.x - 240 - Math.cos(angle) * 43.2) < 1e-9);
    assert.ok(Math.abs(feedback.muzzle.y - 900 - Math.sin(angle) * 43.2) < 1e-9);
  }
});

test('base cannon defaults to facing outward from its own base', () => {
  const origin = { x: 100, y: 100 };

  assert.equal(getBaseCannonRotation('blue', origin, null), 0);
  assert.equal(getBaseCannonRotation('red', origin, null), Math.PI);
});

test('shot feedback uses the recorded firing direction without a projectile or surviving target', () => {
  const base = { x: 100, y: 100, shotCount: 1, shotAngle: Math.PI / 2 };
  assert.deepEqual(getBaseCannonShotFeedback(base, 0), {
    angle: Math.PI / 2,
    muzzle: { x: 100, y: 143.2 }
  });
});

test('shot feedback ignores initial snapshots and repeated updates', () => {
  const base = { x: 100, y: 100, shotCount: 4, shotAngle: 0 };
  assert.equal(getBaseCannonShotFeedback(base, undefined), null);
  assert.equal(getBaseCannonShotFeedback(base, 4), null);
  assert.ok(getBaseCannonShotFeedback(base, 2));
});
