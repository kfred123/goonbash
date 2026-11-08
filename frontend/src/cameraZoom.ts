import { WORLD_HEIGHT, WORLD_WIDTH } from 'shared';

export const DEFAULT_ZOOM = 1;
export const BASE_MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const WHEEL_STEP = 1.1;

export interface ZoomViewport {
  width: number;
  height: number;
}

export function getMinZoom(viewport: ZoomViewport): number {
  if (!Number.isFinite(viewport.width) || viewport.width < 0 ||
      !Number.isFinite(viewport.height) || viewport.height < 0) {
    throw new RangeError('Viewport dimensions must be finite and non-negative');
  }
  return Math.max(BASE_MIN_ZOOM, viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT);
}

export function clampZoom(zoom: number, viewport: ZoomViewport): number {
  if (!Number.isFinite(zoom)) throw new RangeError('Zoom must be finite');
  const minimum = getMinZoom(viewport);
  return Math.min(Math.max(zoom, minimum), Math.max(MAX_ZOOM, minimum));
}

export function wheelZoom(current: number, deltaY: number, viewport: ZoomViewport): number {
  if (!Number.isFinite(deltaY)) throw new RangeError('Wheel delta must be finite');
  const factor = deltaY < 0 ? WHEEL_STEP : deltaY > 0 ? 1 / WHEEL_STEP : 1;
  return clampZoom(current * factor, viewport);
}

export function pinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
  viewport: ZoomViewport
): number {
  if (!Number.isFinite(startDistance) || startDistance <= 0 ||
      !Number.isFinite(currentDistance) || currentDistance < 0) {
    throw new RangeError('Pinch distances must be finite and the starting distance must be positive');
  }
  return clampZoom(startZoom * currentDistance / startDistance, viewport);
}
