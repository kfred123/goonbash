import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLD_HEIGHT, WORLD_WIDTH } from 'shared';
import { BASE_MIN_ZOOM, clampZoom, DEFAULT_ZOOM, getMinZoom, MAX_ZOOM, pinchZoom, wheelZoom, WHEEL_STEP } from './cameraZoom.js';
import { TouchZoomController } from './cameraZoomInput.js';

const viewport = { width: 800, height: 600 };

test('wheel zoom changes one multiplicative step in either direction', () => {
  assert.equal(wheelZoom(DEFAULT_ZOOM, -100, viewport), WHEEL_STEP);
  assert.equal(wheelZoom(WHEEL_STEP, 100, viewport), DEFAULT_ZOOM);
  assert.equal(wheelZoom(DEFAULT_ZOOM, 0, viewport), DEFAULT_ZOOM);
  assert.equal(wheelZoom(MAX_ZOOM, -1, viewport), MAX_ZOOM);
  assert.equal(wheelZoom(BASE_MIN_ZOOM, 1, viewport), BASE_MIN_ZOOM);
  assert.throws(() => wheelZoom(1, NaN, viewport), RangeError);
});

test('zoom remains inside the arena as the viewport changes', () => {
  for (const size of [
    viewport,
    { width: 1920, height: 1080 },
    { width: 800, height: 1600 },
    { width: 6000, height: 4000 }
  ]) {
    const zoom = clampZoom(0, size);
    assert.ok(size.width / zoom <= WORLD_WIDTH);
    assert.ok(size.height / zoom <= WORLD_HEIGHT);
    assert.equal(zoom, getMinZoom(size));
    assert.equal(clampZoom(100, size), Math.max(MAX_ZOOM, zoom));
  }
  assert.equal(getMinZoom(viewport), BASE_MIN_ZOOM);
  assert.equal(clampZoom(0, { width: 0, height: 0 }), BASE_MIN_ZOOM);
  assert.throws(() => getMinZoom({ width: NaN, height: 600 }), RangeError);
  assert.throws(() => getMinZoom({ width: -1, height: 600 }), RangeError);
  assert.throws(() => clampZoom(NaN, viewport), RangeError);
});

test('pinch zoom scales by the distance ratio and respects both limits', () => {
  assert.equal(pinchZoom(1, 100, 150, viewport), 1.5);
  assert.equal(pinchZoom(1, 100, 50, viewport), BASE_MIN_ZOOM);
  assert.equal(pinchZoom(1, 100, 0, viewport), BASE_MIN_ZOOM);
  assert.equal(pinchZoom(1, 100, 500, viewport), MAX_ZOOM);
  assert.throws(() => pinchZoom(1, 0, 100, viewport), RangeError);
  assert.throws(() => pinchZoom(1, NaN, 100, viewport), RangeError);
  assert.throws(() => pinchZoom(1, 100, -1, viewport), RangeError);
  assert.throws(() => pinchZoom(1, 100, Infinity, viewport), RangeError);
});

test('a single touch becomes an arena command only on release', () => {
  const input = new TouchZoomController();
  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  assert.equal(input.canTap(1), true);
  assert.equal(input.end(1, false, 0), true);
  assert.equal(input.canTap(1), false);

  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  assert.equal(input.end(1, true, 0), false);
  input.start(1, { x: 200, y: 590 }, false, 1, 1);
  assert.equal(input.end(1, false, 0), false);
});

test('a pinch never produces a tap and stays suppressed until every finger lifts', () => {
  const input = new TouchZoomController();
  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  input.start(2, { x: 300, y: 200 }, true, 1, 2);
  assert.equal(input.canTap(1), false);
  assert.equal(input.move(2, { x: 400, y: 200 }, true, 1, viewport), 2);
  assert.equal(input.move(2, { x: 250, y: 200 }, true, 2, viewport), 0.5);
  assert.equal(input.end(2, false, 1), false);
  assert.equal(input.canTap(1), false);
  assert.equal(input.end(1, false, 0), false);
  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  assert.equal(input.end(1, false, 0), true);
});

test('pinch coordinates can come from pointer prototype getters', () => {
  class PointerPoint {
    constructor(private readonly px: number, private readonly py: number) {}
    get x() { return this.px; }
    get y() { return this.py; }
  }
  const input = new TouchZoomController();
  input.start(1, new PointerPoint(200, 200), true, 1, 1);
  input.start(2, new PointerPoint(300, 200), true, 1, 2);
  assert.equal(input.move(2, new PointerPoint(400, 200), true, 1, viewport), 2);
});

test('HUD touches, extra fingers and interrupted gestures never become arena commands', () => {
  const input = new TouchZoomController();
  input.start(1, { x: 200, y: 590 }, false, 1, 1);
  input.start(2, { x: 300, y: 200 }, true, 1, 2);
  assert.equal(input.move(2, { x: 400, y: 200 }, true, 1, viewport), null);
  assert.equal(input.end(1, false, 1), false);
  assert.equal(input.end(2, false, 0), false);

  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  input.start(2, { x: 300, y: 200 }, true, 1, 2);
  input.start(3, { x: 400, y: 200 }, true, 1, 3);
  assert.equal(input.move(2, { x: 350, y: 200 }, true, 1, viewport), null);
  assert.equal(input.end(3, false, 2), false);
  assert.equal(input.end(2, false, 1), false);
  assert.equal(input.end(1, false, 0), false);

  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  input.reset();
  input.start(2, { x: 300, y: 200 }, true, 1, 2);
  assert.equal(input.end(2, false, 1), false);
  assert.equal(input.end(1, false, 0), false);
});

test('a zero-distance or HUD-crossing pinch rebases without jumping', () => {
  const input = new TouchZoomController();
  input.start(1, { x: 200, y: 200 }, true, 1, 1);
  input.start(2, { x: 200, y: 200 }, true, 1, 2);
  assert.equal(input.move(2, { x: 250, y: 200 }, true, 1, viewport), null);
  assert.equal(input.move(2, { x: 275, y: 200 }, true, 1, viewport), 1.5);
  assert.equal(input.move(2, { x: 275, y: 590 }, false, 1.5, viewport), null);
  assert.equal(input.move(2, { x: 300, y: 200 }, true, 1.5, viewport), null);
  assert.equal(input.move(2, { x: 320, y: 200 }, true, 1.5, viewport), 1.8);
});
