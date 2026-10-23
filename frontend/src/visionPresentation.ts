import { TeamVision, WORLD_HEIGHT, WORLD_WIDTH } from 'shared';
import type { LanePoint, VisionEntity } from 'shared';

export const FOG_CELL_SIZE = 8;
export const FOG_ALPHA = 0.6;
export const WORLD_FOG_DEPTH = 900;

export function isEntityPresented(
  entity: Pick<VisionEntity, 'x' | 'y' | 'team' | 'hp' | 'state'>,
  vision: TeamVision,
  rendered: LanePoint = entity,
  ruin = false
): boolean {
  if (!vision.team || entity.state === 'dead' || (!ruin && entity.hp <= 0)) return false;
  return entity.team === vision.team || (vision.canSee(entity) && vision.canSee(rendered));
}

export function isProjectilePresented(entity: LanePoint & { team: string }, vision: TeamVision): boolean {
  return !!vision.team && (entity.team === vision.team || vision.canSee(entity));
}

export interface MinimapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getMinimapBounds(viewportWidth: number, viewportHeight: number, hudHeight = 92): MinimapBounds {
  const scale = Math.min(1, viewportWidth / 800, viewportHeight / 600);
  const margin = 10 * scale;
  const y = Math.max(42, 52 * scale);
  const width = Math.max(0, Math.min(200 * scale, viewportWidth - margin * 2, (viewportHeight - hudHeight - y - margin) * 4 / 3));
  return { x: viewportWidth - width - margin, y, width, height: width * 3 / 4 };
}

export function isInsideMinimap(point: LanePoint, bounds: MinimapBounds): boolean {
  return bounds.width > 0 && point.x >= bounds.x && point.y >= bounds.y
    && point.x <= bounds.x + bounds.width && point.y <= bounds.y + bounds.height;
}

export function projectToMinimap(point: LanePoint, bounds: MinimapBounds): LanePoint {
  return {
    x: bounds.x + point.x / WORLD_WIDTH * bounds.width,
    y: bounds.y + point.y / WORLD_HEIGHT * bounds.height
  };
}

export interface MinimapEntity extends VisionEntity { id: string }

export function getMinimapEntities(entities: Iterable<MinimapEntity>, vision: TeamVision): MinimapEntity[] {
  return [...entities].filter((entity) => isEntityPresented(entity, vision));
}

/** Sample only observer bounds, avoiding all-world, all-observer work for every cell. */
export function sampleFog(vision: TeamVision, output = new Uint8Array(Math.ceil(WORLD_WIDTH / FOG_CELL_SIZE) * Math.ceil(WORLD_HEIGHT / FOG_CELL_SIZE))): Uint8Array {
  const columns = Math.ceil(WORLD_WIDTH / FOG_CELL_SIZE);
  const rows = Math.ceil(WORLD_HEIGHT / FOG_CELL_SIZE);
  output.fill(0);
  for (const observer of vision.observers) {
    const minX = Math.max(0, Math.floor((observer.x - observer.budget) / FOG_CELL_SIZE));
    const maxX = Math.min(columns - 1, Math.floor((observer.x + observer.budget) / FOG_CELL_SIZE));
    const minY = Math.max(0, Math.floor((observer.y - observer.budget) / FOG_CELL_SIZE));
    const maxY = Math.min(rows - 1, Math.floor((observer.y + observer.budget) / FOG_CELL_SIZE));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const index = y * columns + x;
        if (!output[index] && vision.observerCanSee(observer, { x: (x + 0.5) * FOG_CELL_SIZE, y: (y + 0.5) * FOG_CELL_SIZE })) {
          output[index] = 1;
        }
      }
    }
  }
  return output;
}
