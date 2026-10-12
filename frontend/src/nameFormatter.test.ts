import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPlayerNameTag } from './nameFormatter.js';

test('formatPlayerNameTag formats remote player as Name (Lvl N)', () => {
  assert.equal(formatPlayerNameTag('Alex', 2, false), 'Alex (Lvl 2)');
  assert.equal(formatPlayerNameTag('Bob', 1, false), 'Bob (Lvl 1)');
  assert.equal(formatPlayerNameTag('Charlie', 10, false), 'Charlie (Lvl 10)');
});

test('formatPlayerNameTag formats local player with (You) suffix', () => {
  assert.equal(formatPlayerNameTag('Alex', 2, true), 'Alex (Lvl 2) (You)');
  assert.equal(formatPlayerNameTag('Player', 1, true), 'Player (Lvl 1) (You)');
});

test('formatPlayerNameTag handles missing or fallback values gracefully', () => {
  assert.equal(formatPlayerNameTag('', 0, false), 'Player (Lvl 1)');
  assert.equal(formatPlayerNameTag('', 3, true), 'Player (Lvl 3) (You)');
});
