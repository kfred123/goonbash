import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TeamVision, VisionTerrain, WORLD_HEIGHT, WORLD_WIDTH } from 'shared';
import type { VisionEntity } from 'shared';
import { FOG_CELL_SIZE, getMinimapBounds, getMinimapEntities, isEntityPresented, isInsideMinimap, isProjectilePresented, projectToMinimap, sampleFog } from './visionPresentation.js';

const terrain = new VisionTerrain([[{ x: 0, y: 500 }, { x: 2400, y: 500 }]], 100);
const ally = { id: 'local', x: 500, y: 500, hp: 100, state: 'alive', team: 'blue', sightRange: 200 };
const enemy = { ...ally, id: 'enemy', x: 650, team: 'red' };

test('unknown team reveals no entities; dead local players retain allied vision', () => {
  assert.equal(isEntityPresented(ally, new TeamVision('', [ally], terrain)), false);
  const local = { ...ally, state: 'dead' };
  const vision = new TeamVision('blue', [local, { ...ally, id: 'scout' }], terrain);
  assert.equal(isEntityPresented(local, vision), false);
  assert.equal(isEntityPresented(enemy, vision), true);
});

test('canonical and interpolated enemy centers both need sight; allies do not', () => {
  const vision = new TeamVision('blue', [ally], terrain);
  assert.equal(isEntityPresented(enemy, vision), true);
  assert.equal(isEntityPresented({ ...enemy, x: 800 }, vision, enemy), false);
  assert.equal(isEntityPresented(enemy, vision, { x: 800, y: 500 }), false);
  assert.equal(isEntityPresented({ ...ally, x: 1800 }, vision), true);
  assert.equal(isEntityPresented({ ...enemy, hp: 0 }, vision), false);
  assert.equal(isEntityPresented({ ...enemy, hp: 0 }, vision, undefined, true), true);
  assert.equal(isEntityPresented({ ...enemy, x: 800, hp: 0 }, vision, undefined, true), false);
});

test('projectile visuals hide enemy shots in fog without hiding allied shots', () => {
  const vision = new TeamVision('blue', [ally], terrain);
  assert.equal(isProjectilePresented({ ...enemy, x: 800 }, vision), false);
  assert.equal(isProjectilePresented(enemy, vision), true);
  assert.equal(isProjectilePresented({ ...ally, x: 800 }, vision), true);
});

test('minimap preserves world coordinates, camera independence and 4:3 aspect on resize', () => {
  for (const [width, height] of [[800, 600], [1920, 1080], [320, 240], [160, 160]]) {
    const bounds = getMinimapBounds(width, height);
    assert.ok(Math.abs(bounds.width / bounds.height - WORLD_WIDTH / WORLD_HEIGHT) < 1e-8);
    assert.deepEqual(projectToMinimap({ x: 0, y: 0 }, bounds), { x: bounds.x, y: bounds.y });
    assert.deepEqual(projectToMinimap({ x: WORLD_WIDTH, y: WORLD_HEIGHT }, bounds), { x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    assert.deepEqual(projectToMinimap({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }, bounds), { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
    assert.ok(bounds.x >= 0 && bounds.y >= 0);
    assert.ok(bounds.x + bounds.width <= width);
    assert.ok(bounds.y + bounds.height <= height - 92);
    assert.equal(isInsideMinimap({ x: bounds.x + 1, y: bounds.y + 1 }, bounds), true);
    assert.equal(isInsideMinimap({ x: 0, y: height }, bounds), false);
  }
});

test('minimap dots contain distant allies and only currently visible living enemies', () => {
  const scout = { ...ally, id: 'scout', x: 1800 };
  const entities = [ally, scout, enemy, { ...enemy, id: 'dead', hp: 0 }, { ...enemy, id: 'hidden', x: 1000 }];
  assert.deepEqual(getMinimapEntities(entities, new TeamVision('blue', [ally], terrain)).map((entry) => entry.id), ['local', 'scout', 'enemy']);
  assert.deepEqual(getMinimapEntities(entities, new TeamVision('blue', [], terrain)).map((entry) => entry.id), ['local', 'scout']);
});

test('fog field reuses buffers and contains no remembered explored cells', () => {
  const vision = new TeamVision('blue', [ally], terrain);
  const field = sampleFog(vision);
  const columns = WORLD_WIDTH / FOG_CELL_SIZE;
  const index = Math.floor(ally.y / FOG_CELL_SIZE) * columns + Math.floor(ally.x / FOG_CELL_SIZE);
  assert.equal(field[index], 1);
  assert.equal(sampleFog(new TeamVision('blue', [], terrain), field), field);
  assert.equal(field[index], 0);
});

test('sampled contour error stays within 12 units for mixed terrain and grass origins', () => {
  // Every raster cell is represented by its center, at most sqrt(2)*8 units
  // from any other point in that cell; measure ray-edge error independently.
  for (const position of [{ x: 500, y: 500 }, { x: 500, y: 575 }]) {
    const observer: VisionEntity = { ...ally, ...position };
    const vision = new TeamVision('blue', [observer], terrain);
    const field = sampleFog(vision);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 32) {
      let exactEdge = 0;
      let rasterEdge = 0;
      for (let distance = 0; distance <= 220; distance += 0.5) {
        const point = { x: position.x + Math.cos(angle) * distance, y: position.y + Math.sin(angle) * distance };
        if (vision.canSee(point)) exactEdge = distance;
        const index = Math.floor(point.y / FOG_CELL_SIZE) * (WORLD_WIDTH / FOG_CELL_SIZE) + Math.floor(point.x / FOG_CELL_SIZE);
        if (field[index]) rasterEdge = distance;
      }
      assert.ok(Math.abs(exactEdge - rasterEdge) <= 12, `${angle}: ${exactEdge} versus ${rasterEdge}`);
    }
  }
});
