import type Phaser from 'phaser';
import { ARENA_LANES, LANE_BORDER_WIDTH, LANE_ROAD_WIDTH, TeamVision, WORLD_HEIGHT, WORLD_WIDTH } from 'shared';
import {
  FOG_ALPHA, FOG_CELL_SIZE, WORLD_FOG_DEPTH, getMinimapBounds, getMinimapEntities, isInsideMinimap,
  projectToMinimap, sampleFog
} from './visionPresentation.js';
import type { MinimapBounds, MinimapEntity } from './visionPresentation.js';

export class FogPresentation {
  private readonly fogTexture: Phaser.Textures.CanvasTexture;
  private readonly terrainTexture: Phaser.Textures.CanvasTexture;
  private readonly pixels: ImageData;
  private readonly field = new Uint8Array(WORLD_WIDTH / FOG_CELL_SIZE * WORLD_HEIGHT / FOG_CELL_SIZE);
  private readonly worldFog: Phaser.GameObjects.Image;
  private readonly minimap: Phaser.GameObjects.Container;
  private readonly terrain: Phaser.GameObjects.Image;
  private readonly miniFog: Phaser.GameObjects.Image;
  private readonly dots: Phaser.GameObjects.Graphics;
  private readonly frame: Phaser.GameObjects.Graphics;
  private bounds: MinimapBounds;
  private readonly fogKey = 'team-vision-fog';
  private readonly terrainKey = 'minimap-terrain';

  constructor(private readonly scene: Phaser.Scene) {
    const columns = WORLD_WIDTH / FOG_CELL_SIZE;
    const rows = WORLD_HEIGHT / FOG_CELL_SIZE;
    const fogTexture = scene.textures.createCanvas(this.fogKey, columns, rows);
    const terrainTexture = scene.textures.createCanvas(this.terrainKey, columns, rows);
    if (!fogTexture || !terrainTexture) throw new Error('Could not create fog/minimap textures');
    this.fogTexture = fogTexture;
    this.terrainTexture = terrainTexture;
    this.pixels = fogTexture.context.createImageData(columns, rows);
    const context = terrainTexture.context;
    context.fillStyle = '#436937';
    context.fillRect(0, 0, columns, rows);
    context.lineCap = context.lineJoin = 'round';
    for (const [width, color] of [[LANE_BORDER_WIDTH, '#403a32'], [LANE_ROAD_WIDTH, '#938b78']] as const) {
      context.lineWidth = width / FOG_CELL_SIZE;
      context.strokeStyle = color;
      context.beginPath();
      for (const lane of ARENA_LANES) {
        context.moveTo(lane[0].x / FOG_CELL_SIZE, lane[0].y / FOG_CELL_SIZE);
        for (const point of lane.slice(1)) context.lineTo(point.x / FOG_CELL_SIZE, point.y / FOG_CELL_SIZE);
      }
      context.stroke();
    }
    terrainTexture.refresh();
    this.worldFog = scene.add.image(0, 0, this.fogKey).setOrigin(0).setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT).setDepth(WORLD_FOG_DEPTH);
    this.terrain = scene.add.image(0, 0, this.terrainKey).setOrigin(0);
    this.miniFog = scene.add.image(0, 0, this.fogKey).setOrigin(0);
    this.dots = scene.add.graphics();
    this.frame = scene.add.graphics();
    this.minimap = scene.add.container(0, 0, [this.terrain, this.miniFog, this.dots, this.frame]).setScrollFactor(0).setDepth(2100);
    this.bounds = getMinimapBounds(scene.scale.width, scene.scale.height);
    this.resize();
    this.update(new TeamVision('', []), [], '');
  }

  resize(): void {
    this.bounds = getMinimapBounds(this.scene.scale.width, this.scene.scale.height);
    const { x, y, width, height } = this.bounds;
    this.minimap.setPosition(x, y).setVisible(width > 0);
    this.terrain.setDisplaySize(width, height);
    this.miniFog.setDisplaySize(width, height);
    this.frame.clear().lineStyle(2, 0x9caab5).strokeRect(0, 0, width, height);
  }

  contains(point: { x: number; y: number }): boolean {
    return isInsideMinimap(point, this.bounds);
  }

  update(vision: TeamVision, entities: Iterable<MinimapEntity>, localId: string): void {
    sampleFog(vision, this.field);
    for (let index = 0; index < this.field.length; index += 1) {
      this.pixels.data[index * 4 + 3] = this.field[index] ? 0 : Math.round(FOG_ALPHA * 255);
    }
    this.fogTexture.context.putImageData(this.pixels, 0, 0);
    this.fogTexture.refresh();
    this.dots.clear();
    const localBounds = { ...this.bounds, x: 0, y: 0 };
    const radius = Math.max(1, 2 * this.bounds.width / 200);
    for (const entity of getMinimapEntities(entities, vision)) {
      const point = projectToMinimap(entity, localBounds);
      this.dots.fillStyle(entity.team === 'blue' ? 0x4d8dff : 0xff554d).fillCircle(point.x, point.y, radius);
      if (entity.id === localId) this.dots.lineStyle(1, 0xffffff).strokeCircle(point.x, point.y, radius + 1);
    }
  }

  destroy(): void {
    this.worldFog.destroy();
    this.minimap.destroy();
    this.scene.textures.remove(this.fogKey);
    this.scene.textures.remove(this.terrainKey);
  }
}
