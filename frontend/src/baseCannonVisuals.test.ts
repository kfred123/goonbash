import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBaseCannonRotation } from './baseCannonVisuals.js';

test('base cannon rotation faces its replicated target position', () => {
  const origin = { x: 100, y: 100 };

  assert.equal(getBaseCannonRotation('blue', origin, { x: 200, y: 100 }), 0);
  assert.equal(getBaseCannonRotation('red', origin, { x: 100, y: 0 }), -Math.PI / 2);
});

test('base cannon defaults to facing outward from its own base', () => {
  const origin = { x: 100, y: 100 };

  assert.equal(getBaseCannonRotation('blue', origin, null), 0);
  assert.equal(getBaseCannonRotation('red', origin, null), Math.PI);
});
