import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTowerCannonRotation, getTowerCannonShotFeedback } from './towerCannonVisuals.js';

test('tower cannon rotation tracks its target and defaults outward', () => {
  const origin = { x: 100, y: 100 };

  assert.equal(getTowerCannonRotation('blue', origin, { x: 200, y: 100 }), 0);
  assert.equal(getTowerCannonRotation('red', origin, { x: 100, y: 0 }), -Math.PI / 2);
  assert.equal(getTowerCannonRotation('blue', origin, null), 0);
  assert.equal(getTowerCannonRotation('red', origin, null), Math.PI);
});

test('shot feedback uses the recorded direction and ignores initial snapshots', () => {
  const tower = { x: 100, y: 100, shotCount: 1, shotAngle: Math.PI / 2 };

  assert.equal(getTowerCannonShotFeedback(tower, undefined), null);
  assert.deepEqual(getTowerCannonShotFeedback(tower, 0), {
    angle: Math.PI / 2,
    muzzle: { x: 100, y: 121 }
  });
  assert.equal(getTowerCannonShotFeedback(tower, 1), null);
});
