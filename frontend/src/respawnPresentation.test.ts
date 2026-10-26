import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TeamVision } from 'shared';
import { getMinimapEntities } from './visionPresentation.js';
import { getRespawnCountdown, getTankPresentation } from './respawnPresentation.js';

const tank = { id: 'local', state: 'dead', team: 'blue', hp: 0, x: 240, y: 900, respawnAt: 10000, sightRange: 390 };

test('dead allied figures are half opaque without combat visibility or minimap dots', () => {
  const vision = new TeamVision('blue', [tank]);
  assert.deepEqual(getTankPresentation(tank, vision), { visible: true, combatVisible: false, alpha: 0.5 });
  assert.deepEqual(getMinimapEntities([tank], vision), []);
  assert.equal(vision.observers.length, 0);
});

test('enemy previews remain hidden even at a visible position; unknown teams see nothing', () => {
  const scout = { ...tank, id: 'scout', state: 'alive', hp: 100, team: 'red' };
  const enemyVision = new TeamVision('red', [scout]);
  assert.equal(enemyVision.canSee(tank), true);
  for (const vision of [enemyVision, new TeamVision('', [])]) {
    assert.deepEqual(getTankPresentation(tank, vision), { visible: false, combatVisible: false, alpha: 1 });
  }
});

test('alive confirmation restores normal opacity and combat visibility', () => {
  const alive = { ...tank, state: 'alive', hp: 100 };
  assert.deepEqual(getTankPresentation(alive, new TeamVision('blue', [alive])), {
    visible: true, combatVisible: true, alpha: 1
  });
});

test('owner countdown rounds up, refreshes from its deadline and clamps at zero', () => {
  for (const [now, expected] of [[5800, '5s'], [6000, '4s'], [9999, '1s'], [10000, '0s'], [11000, '0s']] as const) {
    assert.equal(getRespawnCountdown(tank, true, 'started', now), expected);
  }
  assert.equal(getTankPresentation(tank, new TeamVision('blue', [tank])).combatVisible, false);
});

test('countdown is absent for other players and all cleanup states', () => {
  assert.equal(getRespawnCountdown(tank, false, 'started', 0), null);
  assert.equal(getRespawnCountdown({ ...tank, state: 'alive' }, true, 'started', 0), null);
  assert.equal(getRespawnCountdown(undefined, true, 'started', 0), null);
  assert.equal(getRespawnCountdown(tank, true, 'ended', 0), null);
  assert.equal(getRespawnCountdown(tank, true, 'waiting', 0), null);
});
