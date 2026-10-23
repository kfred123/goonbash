import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import {
  GameState,
  ARENA_LANES,
  LANE_BORDER_WIDTH,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_SCALE,
  WORLD_DIMENSIONS,
  TeamVision,
  getVisionEntities,
  INVALID_TARGET_MESSAGE,
  LANE_ROAD_WIDTH,
  getAbilityDefinition,
  getRequiredXpForNextLevel,
  LobbyInfo,
  MatchPlayerStats,
  ROLE_ABILITY_IDS,
  MAX_ABILITY_LEVEL,
  ROLE_VISUALS,
  Role,
  isRole
} from 'shared';
import type { AbilityId, AbilityActivationRequest, Base, Minion, Tank, VisionEntity, InvalidTargetMessage, MortarImpactMessage, Projectile } from 'shared';
import { MORTAR_IMPACT_MESSAGE, mortarPointRejection } from 'shared';
import { FogPresentation } from './FogPresentation.js';
import { isEntityPresented, isProjectilePresented, WORLD_FOG_DEPTH } from './visionPresentation.js';
import { formatPlayerNameTag } from './nameFormatter.js';
import { ABILITY_KEYS, getAbilitySlotDesignX, getAbilityHudStatus, getRoleAbilityAtIndex, nextWeaponSelection, resolveArenaClick, shouldCancelRocketTargetSelection, shouldHandleAbilityKeydown } from './abilityControls.js';
import type { WeaponSelection } from './abilityControls.js';
import { applyWeaponCursor, mortarShellHeight, MORTAR_REJECTION_TEXT } from './weaponTargeting.js';
import './weaponTargeting.css';
import { getBaseCannonRotation, getBaseCannonShotFeedback } from './baseCannonVisuals.js';
import { getTowerCannonRotation, getTowerCannonShotFeedback } from './towerCannonVisuals.js';
import { getMatchResultsPage, MatchResultsSort, nextMatchResultsSort, sortMatchResults, SortableMatchStat } from './matchResults.js';
import { createRoleTank, RoleTank } from './roleTank.js';
import { getSmoothedHeading, getVehicleHeading } from './roleTankVisuals.js';
import { drawWrench } from './wrenchVisuals.js';
import { createMinionBeetle, MinionBeetle } from './minionBeetle.js';
import { getRespawnCountdown, getTankPresentation } from './respawnPresentation.js';

const ROLE_ORDER: Role[] = ['healer', 'tank', 'damagedealer'];

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private tankSprites: Map<string, RoleTank> = new Map();
  private tankTargets: Map<string, { x: number; y: number }> = new Map();
  private tankNameTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private respawnCountdown?: Phaser.GameObjects.Text;
  private minionSprites: Map<string, MinionBeetle> = new Map();
  private baseSprites: Map<string, { fort: Phaser.GameObjects.Container; cannon: Phaser.GameObjects.Container }> = new Map();
  private baseMuzzleFlashes: Map<string, Phaser.GameObjects.Arc> = new Map();
  private baseShotCounts: Map<string, number> = new Map();
  private towerSprites: Map<string, {
    outpost?: Phaser.GameObjects.Container;
    cannon?: Phaser.GameObjects.Container;
    ruin?: Phaser.GameObjects.Graphics;
  }> = new Map();
  private towerMuzzleFlashes: Map<string, Phaser.GameObjects.Arc> = new Map();
  private towerShotCounts: Map<string, number> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private mortarShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private mortarLandingMarkers = new Map<string, Phaser.GameObjects.Arc>();
  private mortarImpacts = new Map<string, Phaser.GameObjects.Arc>();
  private seenMortarImpacts = new Set<string>();
  private healthBars: Map<string, { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; width: number }> = new Map();
  private attackMarkers: Array<{ graphics: Phaser.GameObjects.Graphics; targetId: string }> = [];
  private statusText!: Phaser.GameObjects.Text;
  private menuElements: Array<
    Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform
  > = [];
  private menuBackground?: Phaser.GameObjects.Rectangle;
  private arenaBackgroundObjects: Phaser.GameObjects.GameObject[] = [];
  private arenaTitle?: Phaser.GameObjects.Text;
  private fog?: FogPresentation;
  private vision = new TeamVision('', []);
  private visibleEntities = new Set<string>();
  private viewportWidth = 800;
  private viewportHeight = 600;
  private nameInputEl: HTMLInputElement | null = null;
  private playerName = '';
  private leavingRoom = false;
  private arenaStarted = false;
  private resultsShown = false;
  private resultSorts: Record<'red' | 'blue', MatchResultsSort> = {
    red: { stat: 'kills', direction: 'desc' },
    blue: { stat: 'kills', direction: 'desc' }
  };
  private resultPages: Record<'red' | 'blue', number> = { red: 0, blue: 0 };
  private static readonly RESULTS_PAGE_SIZE = 6;
  private abilityHud?: {
    bar: Phaser.GameObjects.Rectangle;
    barBorder: Phaser.GameObjects.Rectangle;
    levelText: Phaser.GameObjects.Text;
    xpBarBg: Phaser.GameObjects.Rectangle;
    xpBarFill: Phaser.GameObjects.Rectangle;
    xpText: Phaser.GameObjects.Text;
    skillPointsText: Phaser.GameObjects.Text;
    slots: Array<{
      abilityId: AbilityId;
      slotBg: Phaser.GameObjects.Rectangle;
      icon: Phaser.GameObjects.Graphics;
      cooldownOverlay: Phaser.GameObjects.Rectangle;
      titleText: Phaser.GameObjects.Text;
      statusText: Phaser.GameObjects.Text;
      abilityLevelText: Phaser.GameObjects.Text;
      upgradeButtonBg: Phaser.GameObjects.Rectangle;
      upgradeButtonText: Phaser.GameObjects.Text;
      slotSize: number;
      slotTop: number;
      slotCenterX: number;
      abilityLearned: boolean | null;
    }>;
  };
  private myAbilityState: {
    role: string;
    level: number;
    xp: number;
    skillPoints: number;
    abilities: Map<AbilityId, { level: number; cooldownEndsAt: number; cooldownMax: number; activeUntil: number }>;
  } | null = null;
  private weaponSelection: WeaponSelection = null;
  private mortarPreview?: Phaser.GameObjects.Graphics;
  private rocketTargetHint?: Phaser.GameObjects.Text;
  private healEffectIcons: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private static readonly NAME_STORAGE_KEY = 'goonbash_player_name';
  private static readonly MAX_NAME_LENGTH = 20;
  private static readonly CLICK_HIT_RADIUS_TANK = 24 * WORLD_SCALE.entity;
  private static readonly CLICK_HIT_RADIUS_MINION = 14 * WORLD_SCALE.entity;
  private static readonly CLICK_HIT_RADIUS_BASE = 40 * WORLD_SCALE.entity;
  private static readonly CLICK_HIT_RADIUS_TOWER = 20 * WORLD_SCALE.entity;
  private static readonly TANK_NAME_OFFSET = 38 * WORLD_SCALE.entity;
  private static readonly TANK_HEALTH_OFFSET = 49 * WORLD_SCALE.entity;
  private static readonly MINION_HEALTH_OFFSET = 16 * WORLD_SCALE.entity;
  private static readonly BASE_HEALTH_OFFSET = 44 * WORLD_SCALE.entity;
  private static readonly TOWER_HEALTH_OFFSET = 22 * WORLD_SCALE.entity;
  private static readonly CLICK_MARKER_DURATION_MS = 1000;
  private static readonly HUD_BAR_HEIGHT = 92;
  // World is 3x the 800x600 viewport (matching backend GameRoom's WORLD_WIDTH/WORLD_HEIGHT)
  // so the camera only ever shows a portion of the map at once.
  private static readonly WORLD_WIDTH = WORLD_WIDTH;
  private static readonly WORLD_HEIGHT = WORLD_HEIGHT;
  private static readonly CAMERA_LERP = 0.1;
  private readonly backendHttpUrl = (import.meta as any).env?.VITE_BACKEND_HTTP_URL || `${window.location.protocol}//${window.location.hostname}:2567`;
  private readonly backendWsUrl = (import.meta as any).env?.VITE_BACKEND_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:2567`;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('grass', '/assets/textures/grass_texture.jpg');
    this.load.image('cobblestone', '/assets/textures/cobblestone_texture.jpg');
    this.load.tilemapTiledJSON('arena-map', '/assets/maps/arena.json');
  }

  create() {
    this.leavingRoom = false;
    this.arenaStarted = false;
    this.resultsShown = false;
    this.viewportWidth = this.scale.width;
    this.viewportHeight = this.scale.height;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.cameras.main.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    this.statusText = this.add.text(10, 10, 'Lobby menu', {
      color: '#aaaaff', fontSize: '14px',
      backgroundColor: '#00000088', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(2200);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerClick(pointer));
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (shouldHandleAbilityKeydown(event)) this.activateRoleAbility(0);
    });
    this.input.keyboard?.on('keydown-E', (event: KeyboardEvent) => {
      if (shouldHandleAbilityKeydown(event)) this.activateRoleAbility(1);
    });
    this.input.keyboard?.on('keydown-R', (event: KeyboardEvent) => {
      if (shouldHandleAbilityKeydown(event)) this.activateRoleAbility(2);
    });
    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      if (shouldCancelRocketTargetSelection(-1, event.key)) this.cancelRocketTargetSelection();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.arenaStarted = false;
      this.leavingRoom = true;
      this.room?.removeAllListeners();
      if (this.room) void this.room.leave().catch((error) => console.error('[GameScene] Failed to leave room on shutdown', error));
      this.clearArenaPresentation();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
    this.showMainMenu();
  }

  /** Stops the camera following the local player and resets it to the origin, for menu/lobby screens with no arena. */
  private resetCamera() {
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);
  }

  private loadStoredName(): string {
    try {
      return window.localStorage.getItem(GameScene.NAME_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private saveStoredName(name: string) {
    try {
      window.localStorage.setItem(GameScene.NAME_STORAGE_KEY, name);
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  private showMainMenu(message = '') {
    this.resetCamera();
    this.destroyMenuElements();
    if (!this.playerName) this.playerName = this.loadStoredName();
    this.addMenuText(400, 140, 'GOONBASH', 42, '#ffffff', true);
    this.addMenuText(400, 195, 'Enter your name to continue', 18, '#aaaaff');
    this.createNameInput(this.playerName);
    const validationText = this.addMenuText(400, 300, message, 16, '#ff8888');
    this.addButton(400, 360, 200, 44, 'CONTINUE', () => {
      const name = (this.nameInputEl?.value ?? '').trim().slice(0, GameScene.MAX_NAME_LENGTH);
      if (!name) {
        validationText.setText('Please enter a name to continue.');
        return;
      }
      this.playerName = name;
      this.saveStoredName(name);
      this.showLobbyMenu();
    });
  }

  private createNameInput(initialValue: string) {
    const container = document.getElementById('game-container');
    if (!container) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = GameScene.MAX_NAME_LENGTH;
    input.value = initialValue;
    input.placeholder = 'Your name';
    Object.assign(input.style, {
      position: 'absolute',
      left: '50%',
      top: 'calc(50% - 40px)',
      transform: 'translateX(-50%)',
      width: '200px',
      height: '32px',
      fontSize: '16px',
      padding: '4px 8px',
      boxSizing: 'border-box'
    });
    container.appendChild(input);
    input.focus();
    this.nameInputEl = input;
  }

  private removeNameInput() {
    this.nameInputEl?.remove();
    this.nameInputEl = null;
  }

  private backToMainMenu() {
    if (this.leavingRoom) return;
    this.leavingRoom = true;
    const room = this.room;
    if (room) {
      void room.leave().catch((error) => console.error('[GameScene] Failed to leave game room', error));
    }
    this.arenaStarted = false;
    this.resultsShown = false;
    this.resultPages = { red: 0, blue: 0 };
    this.clearArenaPresentation();
    this.room = undefined as unknown as Room<GameState>;
    this.leavingRoom = false;
    this.showMainMenu();
  }

  private showLobbyMenu(message = '') {
    this.resetCamera();
    this.destroyMenuElements();
    this.addMenuText(400, 90, 'GOONBASH', 42, '#ffffff', true);
    this.addMenuText(400, 140, 'Choose a game or create your own', 18, '#aaaaff');
    this.addMenuText(245, 205, 'AVAILABLE GAMES', 16, '#00ff88', true);
    this.addButton(700, 205, 190, 44, 'CREATE GAME', () => void this.createLobby());
    this.addButton(520, 205, 100, 36, 'REFRESH', () => this.showLobbyMenu());
    this.addButton(730, 30, 130, 34, 'MAIN MENU', () => this.showMainMenu());
    const listStatus = this.addMenuText(400, 275, message || 'Loading games...', 18, '#c8c8d8');
    void this.loadLobbies(listStatus);
  }

  private async loadLobbies(listStatus: Phaser.GameObjects.Text) {
    try {
      const response = await fetch(`${this.backendHttpUrl}/lobbies`);
      if (!response.ok) throw new Error(`Lobby request failed (${response.status})`);
      const data = await response.json() as { lobbies: LobbyInfo[] };
      listStatus.destroy();
      if (data.lobbies.length === 0) {
        this.addMenuText(400, 285, 'No games available yet.', 18, '#c8c8d8');
        return;
      }
      data.lobbies.forEach((lobby, index) => {
        const y = 275 + index * 58;
        this.addMenuText(220, y, lobby.name, 18, '#ffffff');
        this.addMenuText(470, y, `${lobby.players}/${lobby.maxPlayers} players`, 16, '#aaaaff');
        this.addButton(700, y, 130, 36, 'JOIN', () => void this.joinLobby(lobby));
      });
    } catch (error) {
      console.error('[GameScene] Failed to load lobbies', error);
      listStatus.setText('Could not load games. Is the server running?');
      listStatus.setColor('#ff8888');
      this.addButton(400, 330, 140, 36, 'RETRY', () => this.showLobbyMenu());
    }
  }

  private async createLobby() {
    try {
      const response = await fetch(`${this.backendHttpUrl}/lobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Game' })
      });
      if (!response.ok) throw new Error(`Create lobby failed (${response.status})`);
      const data = await response.json() as { lobby: LobbyInfo };
      await this.connectToLobby(data.lobby);
    } catch (error) {
      console.error('[GameScene] Failed to create lobby', error);
      this.showLobbyMenu('Could not create the game. Please try again.');
    }
  }

  private async joinLobby(lobby: LobbyInfo) {
    try {
      await this.connectToLobby(lobby);
    } catch (error) {
      console.error('[GameScene] Failed to join lobby', error);
      this.showLobbyMenu('This game is no longer available. Refresh and try again.');
    }
  }

  private async connectToLobby(lobby: LobbyInfo) {
    this.resultsShown = false;
    this.resultPages = { red: 0, blue: 0 };
    this.resultSorts = {
      red: { stat: 'kills', direction: 'desc' },
      blue: { stat: 'kills', direction: 'desc' }
    };
    this.client = new Client(this.backendWsUrl);
    this.room = await this.client.joinOrCreate<GameState>('game_room', { lobbyId: lobby.id, playerName: this.playerName });
    const connectedRoom = this.room;
    this.room.onLeave(() => {
      if (this.room === connectedRoom && !this.leavingRoom && this.sys.isActive()) this.backToMainMenu();
    });
    this.room.onMessage(INVALID_TARGET_MESSAGE, (message: InvalidTargetMessage) => {
      if (this.room !== connectedRoom) return;
      if (message.action === 'mortar') {
        this.statusText.setText(MORTAR_REJECTION_TEXT[message.reason]).setColor('#ffbb88');
        return;
      }
      this.attackMarkers.forEach(({ graphics }) => {
        this.tweens.killTweensOf(graphics);
        graphics.destroy();
      });
      this.attackMarkers = [];
      this.cancelRocketTargetSelection();
      this.statusText.setText('Target is no longer visible or valid.').setColor('#ffbb88');
    });
    this.room.onMessage(MORTAR_IMPACT_MESSAGE, (message: MortarImpactMessage) => {
      if (this.room === connectedRoom && this.arenaStarted && !this.resultsShown) this.showMortarImpact(message);
    });
    this.statusText.setText(`Connected | ${this.room.sessionId}`);
    this.statusText.setColor('#44ff88');
    this.destroyMenuElements();
    this.room.state.tanks.onAdd((tank, sessionId) => {
      if (this.room === connectedRoom && this.arenaStarted) this.upsertTank(tank, sessionId);
    });
    this.room.state.tanks.onRemove((_tank, sessionId) => {
      if (this.room === connectedRoom && this.arenaStarted) this.removeTank(sessionId);
    });
    this.room.state.minions.forEach((minion, id) => this.upsertMinion(minion, id));
    this.room.state.minions.onAdd((minion, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.upsertMinion(minion, id);
    });
    this.room.state.minions.onRemove((_minion, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.removeMinion(id);
    });
    this.room.state.towers.onAdd((tower, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.upsertTower(tower, id);
    });
    this.room.state.towers.onRemove((_tower, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.removeTower(id);
    });
    this.room.state.bases.onAdd((base, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.upsertBase(base, id);
    });
    this.room.state.bases.onRemove((_base, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.removeBase(id);
    });
    this.room.state.projectiles.forEach((projectile, id) => this.upsertProjectile(projectile, id));
    this.room.state.projectiles.onAdd((projectile, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.upsertProjectile(projectile, id);
    });
    this.room.state.projectiles.onRemove((_projectile, id) => {
      if (this.room === connectedRoom && this.arenaStarted) this.removeProjectile(id);
    });
    this.room.onStateChange((state: any) => {
      if (this.room !== connectedRoom) return;
      if (this.resultsShown) return;
      if (state.phase === 'waiting') {
        this.showWaitingLobby(state);
        return;
      }
      if (state.phase === 'ended') {
        this.showMatchResults(state);
        return;
      }
      this.rebuildVision();
      if (state.phase === 'started' && !this.arenaStarted) {
        this.createArena(state.lobbyName);
        this.arenaStarted = true;
        state.tanks?.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
        state.bases?.forEach((base: any, id: string) => this.upsertBase(base, id));
        state.towers?.forEach((tower: any, id: string) => this.upsertTower(tower, id));
      }
      if (this.arenaStarted && state.tanks && typeof state.tanks.forEach === 'function') {
        state.tanks.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
      }
      if (this.arenaStarted && state.minions && typeof state.minions.forEach === 'function') {
        state.minions.forEach((minion: any, id: string) => this.upsertMinion(minion, id));
      }
      if (this.arenaStarted && state.projectiles && typeof state.projectiles.forEach === 'function') {
        state.projectiles.forEach((projectile: any, id: string) => this.upsertProjectile(projectile, id));
      }
      if (this.arenaStarted && state.bases && typeof state.bases.forEach === 'function') {
        state.bases.forEach((base: any, id: string) => this.upsertBase(base, id));
      }
      if (this.arenaStarted && state.towers && typeof state.towers.forEach === 'function') {
        state.towers.forEach((tower: any, id: string) => this.upsertTower(tower, id));
      }
      this.applyVisibility();
      this.refreshFog();
    });
    this.showWaitingLobby(this.room.state);
  }

  private createArena(lobbyName: string) {
    this.clearArenaPresentation();
    this.destroyMenuElements();
    this.createTilemap();
    this.arenaTitle = this.add.text(this.viewportX(400), 20, lobbyName, { color: '#ffffff', fontSize: '24px', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1500)
      .setScale(this.viewportScale());
    this.createAbilityHud();
    this.fog = new FogPresentation(this);
    this.rebuildVision();
    this.refreshFog();
  }

  /** Creates the tilemap-based arena background from the preloaded Tiled JSON and texture assets. */
  private createTilemap() {
    const map = this.make.tilemap({ key: 'arena-map' });
    const grassTileset = map.addTilesetImage('grass', 'grass');
    if (grassTileset) {
      const layer = map.createLayer('ground', grassTileset);
      if (layer) {
        layer.setDepth(-1);
        this.arenaBackgroundObjects.push(layer);
      }
    }
    this.drawLaneStreets();
  }

  private drawLaneStreets() {
    const lanes = ARENA_LANES;
    const roadWidth = LANE_ROAD_WIDTH;
    const borderWidth = LANE_BORDER_WIDTH;
    const textureKey = 'lane-roads';
    if (this.textures.exists(textureKey)) this.textures.remove(textureKey);
    const roadTexture = this.textures.createCanvas(textureKey, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    if (!roadTexture) throw new Error('Could not create lane road texture');

    const stoneSource = this.textures.get('cobblestone').getSourceImage();
    if (!(stoneSource instanceof HTMLImageElement) && !(stoneSource instanceof HTMLCanvasElement)) {
      throw new Error('Cobblestone texture source is not a drawable image');
    }
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 64;
    tileCanvas.height = 64;
    const tileContext = tileCanvas.getContext('2d');
    if (!tileContext) throw new Error('Could not create cobblestone pattern canvas');
    tileContext.drawImage(stoneSource, 0, 0, 64, 64, 0, 0, 64, 64);

    const context = roadTexture.context;
    const cobblestonePattern = context.createPattern(tileCanvas, 'repeat');
    if (!cobblestonePattern) throw new Error('Could not create repeating cobblestone pattern');

    const traceLanes = () => {
      for (const lane of lanes) {
        context.moveTo(lane[0].x, lane[0].y);
        for (let index = 1; index < lane.length; index += 1) {
          context.lineTo(lane[index].x, lane[index].y);
        }
      }
    };

    context.beginPath();
    traceLanes();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = borderWidth;
    context.strokeStyle = '#403a32';
    context.stroke();

    context.beginPath();
    traceLanes();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = roadWidth;
    context.strokeStyle = cobblestonePattern;
    context.stroke();

    roadTexture.refresh();
    this.arenaBackgroundObjects.push(
      this.add.image(GameScene.WORLD_WIDTH / 2, GameScene.WORLD_HEIGHT / 2, textureKey).setDepth(-0.5)
    );
  }

  private clearArenaPresentation() {
    this.destroyRespawnCountdown();
    this.fog?.destroy();
    this.fog = undefined;
    this.vision = new TeamVision('', []);
    this.visibleEntities.clear();
    this.destroyAbilityHud();
    this.arenaTitle?.destroy();
    this.arenaTitle = undefined;
    this.arenaBackgroundObjects.forEach((object) => object.destroy());
    this.arenaBackgroundObjects = [];
    if (this.textures.exists('lane-roads')) this.textures.remove('lane-roads');
    this.tankSprites.forEach((sprite) => sprite.destroy());
    this.tankSprites.clear();
    this.tankTargets.clear();
    this.tankNameTexts.forEach((text) => text.destroy());
    this.tankNameTexts.clear();
    this.minionSprites.forEach((sprite) => sprite.destroy());
    this.minionSprites.clear();
    this.baseSprites.forEach(({ fort }) => fort.destroy());
    this.baseSprites.clear();
    this.baseMuzzleFlashes.forEach((flash) => {
      this.tweens.killTweensOf(flash);
      flash.destroy();
    });
    this.baseMuzzleFlashes.clear();
    this.baseShotCounts.clear();
    this.towerSprites.forEach(({ outpost, ruin }) => {
      outpost?.destroy();
      ruin?.destroy();
    });
    this.towerSprites.clear();
    this.towerMuzzleFlashes.forEach((flash) => {
      this.tweens.killTweensOf(flash);
      flash.destroy();
    });
    this.towerMuzzleFlashes.clear();
    this.towerShotCounts.clear();
    this.projectileSprites.forEach((sprite) => sprite.destroy());
    this.projectileSprites.clear();
    this.clearMortarPresentation();
    this.healthBars.forEach(({ bg, fill }) => {
      bg.destroy();
      fill.destroy();
    });
    this.healthBars.clear();
    this.attackMarkers.forEach(({ graphics }) => {
      this.tweens.killTweensOf(graphics);
      graphics.destroy();
    });
    this.attackMarkers = [];
  }

  private showMatchResults(state: GameState) {
    if (!this.room) return;
    this.destroyRespawnCountdown();
    this.resultsShown = true;
    this.arenaStarted = true;
    this.resetCamera();
    this.destroyAbilityHud();
    this.clearMortarPresentation();
    this.fog?.destroy();
    this.fog = undefined;
    this.destroyMenuElements();

    const background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a0d13, 0.97)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(3000);
    this.menuBackground = background;
    this.menuElements.push(background);

    const localStats = state.playerStats.get(this.room.sessionId);
    const localTank = state.tanks.get(this.room.sessionId);
    const localTeam = localStats?.team ?? localTank?.team;
    const isVictory = localTeam === state.winnerTeam;
    this.addMenuText(400, 58, isVictory ? 'VICTORY' : 'DEFEAT', 38, isVictory ? '#7dff9b' : '#ff8585', true);
    this.addMenuText(400, 105, `${state.lobbyName} · Winner: ${String(state.winnerTeam).toUpperCase()}`, 16, '#c8d4e2');
    this.addMenuText(400, 133, 'Select a column to sort; select it again to reverse the order', 13, '#9ba9bb');

    const teamPlayers: Record<'red' | 'blue', MatchPlayerStats[]> = { red: [], blue: [] };
    state.playerStats.forEach((player) => {
      if (player.team === 'red' || player.team === 'blue') teamPlayers[player.team].push(player);
    });

    this.renderTeamResults('red', teamPlayers.red, 200, localStats);
    this.renderTeamResults('blue', teamPlayers.blue, 600, localStats);
    this.addButton(400, 550, 210, 42, 'RETURN TO MAIN MENU', () => this.backToMainMenu());
  }

  private renderTeamResults(
    team: 'red' | 'blue',
    players: MatchPlayerStats[],
    centerX: number,
    localStats?: MatchPlayerStats
  ) {
    const color = team === 'red' ? '#ff8585' : '#87aaff';
    const sort = this.resultSorts[team];
    const sortedPlayers = sortMatchResults(players, sort);
    this.addMenuText(centerX, 168, `${team.toUpperCase()} TEAM`, 17, color, true);
    const columns: Array<{ stat: SortableMatchStat; label: string; offsetX: number }> = [
      { stat: 'kills', label: 'KILLS', offsetX: 25 },
      { stat: 'level', label: 'LEVEL', offsetX: 95 },
      { stat: 'damageDealt', label: 'DAMAGE', offsetX: 165 }
    ];
    this.addMenuText(centerX - 125, 198, 'PLAYER', 12, '#c8d4e2', true);
    columns.forEach(({ stat, label, offsetX }) => {
      const active = sort.stat === stat;
      const direction = sort.direction === 'desc' ? ' DESC' : ' ASC';
      const heading = this.add.text(this.viewportX(centerX + offsetX), this.viewportY(198), `${label}${active ? direction : ''}`, {
        color: active ? '#ffffff' : '#9ba9bb',
        fontSize: '11px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3002).setScale(this.viewportScale()).setInteractive({ useHandCursor: true });
      heading.on('pointerdown', () => {
        this.resultSorts[team] = nextMatchResultsSort(this.resultSorts[team], stat);
        this.showMatchResults(this.room.state);
      });
      this.menuElements.push(heading);
    });

    if (sortedPlayers.length === 0) {
      this.addMenuText(centerX, 230, 'No players', 13, '#9ba9bb');
      return;
    }

    const resultPage = getMatchResultsPage(sortedPlayers, this.resultPages[team], GameScene.RESULTS_PAGE_SIZE);
    this.resultPages[team] = resultPage.page;
    resultPage.items.forEach((player, index) => {
      const y = 230 + index * 42;
      const isLocalPlayer = player === localStats;
      const rowColor = isLocalPlayer ? '#ffffff' : '#d6deea';
      this.addMenuText(centerX - 125, y, `${player.name}${isLocalPlayer ? ' (You)' : ''}`, 12, rowColor);
      this.addMenuText(centerX + 25, y, String(player.kills), 12, '#ffffff');
      this.addMenuText(centerX + 95, y, String(player.level), 12, '#ffffff');
      this.addMenuText(centerX + 165, y, String(player.damageDealt), 12, '#ffffff');
    });

    if (resultPage.pageCount > 1) {
      this.addButton(centerX - 90, 486, 64, 30, 'PREV', () => {
        this.resultPages[team] = Math.max(0, this.resultPages[team] - 1);
        this.showMatchResults(this.room.state);
      });
      this.addMenuText(centerX, 486, `${resultPage.page + 1} / ${resultPage.pageCount}`, 12, '#c8d4e2');
      this.addButton(centerX + 90, 486, 64, 30, 'NEXT', () => {
        this.resultPages[team] = Math.min(resultPage.pageCount - 1, this.resultPages[team] + 1);
        this.showMatchResults(this.room.state);
      });
    }
  }

  private showWaitingLobby(state: GameState) {
    if (this.arenaStarted || !this.room) return;
    this.resetCamera();
    this.destroyMenuElements();
    const myTank = state.tanks.get(this.room.sessionId) as any;
    this.addMenuText(400, 65, state.lobbyName, 30, '#ffffff', true);
    this.addMenuText(400, 100, 'Choose your team and role while the host prepares the match', 15, '#aaaaff');
    this.addMenuText(220, 145, 'RED TEAM', 17, '#ff7777', true);
    this.addMenuText(580, 145, 'BLUE TEAM', 17, '#7799ff', true);

    let redCount = 0;
    let blueCount = 0;
    state.tanks.forEach((tank, sessionId) => {
      const isRed = tank.team === 'red';
      const x = isRed ? 220 : 580;
      const index = isRed ? redCount++ : blueCount++;
      const isMe = sessionId === this.room.sessionId;
      const roleVisual = this.resolveRoleVisual((tank as any).role);
      const namePart = isMe ? `${tank.name} (You)` : tank.name;
      this.addMenuText(x, 180 + index * 24, `${namePart} · ${roleVisual.label}`, 14, isRed ? '#ffaaaa' : '#aaccff');
    });

    this.addButton(220, 370, 150, 38, 'JOIN RED', () => this.room.send('change_team', 'red'));
    this.addButton(580, 370, 150, 38, 'JOIN BLUE', () => this.room.send('change_team', 'blue'));

    this.addMenuText(400, 415, 'CHOOSE YOUR ROLE', 15, '#00ff88', true);
    ROLE_ORDER.forEach((role, index) => {
      const x = 250 + index * 150;
      const teamColor = myTank?.team === 'blue' ? 0x4d8dff : 0xff4444;
      this.addRoleCard(x, 467, role, myTank?.role === role, teamColor, () => this.room.send('select_role', role));
    });

    this.addButton(730, 30, 130, 34, 'LEAVE GAME', () => this.backToMainMenu());
    if (state.hostSessionId === this.room.sessionId) {
      this.addButton(315, 535, 190, 40, 'RENAME GAME', () => this.renameLobby(state.lobbyName));
      this.addButton(535, 535, 190, 40, 'START GAME', () => this.room.send('start_game'));
    } else {
      this.addMenuText(400, 535, 'Waiting for the host to start the game', 16, '#c8c8d8');
    }
  }

  private renameLobby(currentName: string) {
    const name = window.prompt('Game name', currentName);
    if (name) this.room.send('rename_lobby', name);
  }

  private addMenuText(x: number, y: number, text: string, fontSize: number, color: string, bold = false) {
    const element = this.add.text(this.viewportX(x), this.viewportY(y), text, {
      color, fontSize: `${fontSize}px`, fontStyle: bold ? 'bold' : 'normal'
    }).setOrigin(0.5).setDepth(3001).setScale(this.viewportScale());
    this.menuElements.push(element);
    return element;
  }

  private addButton(x: number, y: number, width: number, height: number, label: string, action: () => void) {
    x = this.viewportX(x);
    y = this.viewportY(y);
    const button = this.add.rectangle(x, y, width, height, 0x245c52).setDepth(3001).setScale(this.viewportScale()).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { color: '#ffffff', fontSize: '15px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3002).setScale(this.viewportScale());
    button.on('pointerover', () => button.setFillStyle(0x347d6c));
    button.on('pointerout', () => button.setFillStyle(0x245c52));
    button.on('pointerdown', action);
    this.menuElements.push(button, text);
    return button;
  }

  /** Renders a selectable role preview in the player's team color. */
  private addRoleCard(x: number, y: number, role: Role, selected: boolean, teamColor: number, action: () => void) {
    x = this.viewportX(x);
    y = this.viewportY(y);
    const visual = ROLE_VISUALS[role];
    const width = 130;
    const height = 84;
    const card = this.add.rectangle(x, y, width, height, teamColor, selected ? 0.85 : 0.25).setScale(this.viewportScale()).setInteractive({ useHandCursor: true });
    card.setStrokeStyle(selected ? 4 : 2, teamColor, selected ? 1 : 0.6);
    const icon = this.createRoleShape(x, y - 10 * this.viewportScale(), role, 32, teamColor);
    icon.setAlpha(selected ? 1 : 0.85).setScale(this.viewportScale());
    const text = this.add.text(x, y + 27 * this.viewportScale(), visual.label, { color: '#ffffff', fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5).setScale(this.viewportScale());
    card.on('pointerover', () => card.setFillStyle(teamColor, selected ? 0.85 : 0.45));
    card.on('pointerout', () => card.setFillStyle(teamColor, selected ? 0.85 : 0.25));
    card.on('pointerdown', action);
    this.menuElements.push(card, icon, text);
    return card;
  }

  private resolveRoleVisual(role: unknown) {
    return ROLE_VISUALS[isRole(role) ? role : 'tank'];
  }

  private createRoleShape(x: number, y: number, role: Role, size: number, color: number): RoleTank {
    return createRoleTank(this, x, y, role, size, color);
  }

  private destroyMenuElements() {
    this.menuElements.forEach((element) => element.destroy());
    this.menuElements = [];
    this.menuBackground = undefined;
    this.removeNameInput();
  }

  private viewportX(designX: number) {
    return this.scale.width / 2 + (designX - 400) * this.viewportScale();
  }

  private viewportY(designY: number) {
    return this.scale.height / 2 + (designY - 300) * this.viewportScale();
  }

  private viewportScale() {
    return Math.min(1, this.scale.width / 800, this.scale.height / 600);
  }

  private handleResize() {
    const scaleRatio = this.viewportScale() / Math.min(1, this.viewportWidth / 800, this.viewportHeight / 600);
    const deltaY = this.scale.height - this.viewportHeight;
    this.menuElements.forEach((element) => {
      if (element === this.menuBackground) {
        this.menuBackground?.setSize(this.scale.width, this.scale.height);
      } else {
        element.setPosition(
          this.scale.width / 2 + (element.x - this.viewportWidth / 2) * scaleRatio,
          this.scale.height / 2 + (element.y - this.viewportHeight / 2) * scaleRatio
        ).setScale(element.scaleX * scaleRatio, element.scaleY * scaleRatio);
      }
    });
    this.arenaTitle?.setPosition(
      this.scale.width / 2 + (this.arenaTitle.x - this.viewportWidth / 2) * scaleRatio,
      this.arenaTitle.y
    ).setScale(scaleRatio);
    this.resizeAbilityHud(scaleRatio, deltaY);
    this.fog?.resize();
    this.refreshFog();
    this.viewportWidth = this.scale.width;
    this.viewportHeight = this.scale.height;
  }

  private resizeAbilityHud(scaleRatio: number, deltaY: number) {
    if (!this.abilityHud) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const barTop = height - GameScene.HUD_BAR_HEIGHT;
    this.abilityHud.bar.setPosition(width / 2, barTop + GameScene.HUD_BAR_HEIGHT / 2).setSize(width, GameScene.HUD_BAR_HEIGHT);
    this.abilityHud.barBorder.setPosition(width / 2, barTop).setSize(width, 3);
    const resizeElement = (element: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform, yDelta: number) => {
      element.setPosition(
        width / 2 + (element.x - this.viewportWidth / 2) * scaleRatio,
        element.y + yDelta
      ).setScale(element.scaleX * scaleRatio, element.scaleY * scaleRatio);
    };
    resizeElement(this.abilityHud.levelText, deltaY);
    resizeElement(this.abilityHud.xpBarBg, deltaY);
    resizeElement(this.abilityHud.xpBarFill, deltaY);
    resizeElement(this.abilityHud.xpText, deltaY);
    resizeElement(this.abilityHud.skillPointsText, deltaY);
    this.abilityHud.slots.forEach((slot) => {
      slot.slotCenterX = width / 2 + (slot.slotCenterX - this.viewportWidth / 2) * scaleRatio;
      slot.slotTop += deltaY;
      resizeElement(slot.slotBg, deltaY);
      resizeElement(slot.cooldownOverlay, deltaY);
      resizeElement(slot.titleText, deltaY);
      resizeElement(slot.statusText, deltaY);
      resizeElement(slot.abilityLevelText, deltaY);
      resizeElement(slot.upgradeButtonBg, deltaY);
      resizeElement(slot.upgradeButtonText, deltaY);
      slot.slotTop = slot.slotBg.y - slot.slotSize * this.viewportScale() / 2;
      slot.cooldownOverlay.setY(slot.slotTop);
    });
    this.rocketTargetHint?.setX(width / 2).setScale(this.viewportScale());
  }

  private upsertTank(tank: Tank, sessionId: string) {
    if (!tank) return;

    const x = tank.x ?? 200;
    const y = tank.y ?? 200;
    const isDead = tank.state === 'dead';
    const role = isRole(tank.role) ? tank.role : 'tank';
    const teamColor = tank.team === 'blue' ? 0x4d8dff : 0xff4444;

    const isMe = sessionId === this.room.sessionId;
    const fullDisplayName = formatPlayerNameTag(tank.name, tank.level, isMe);

    if (this.tankSprites.has(sessionId)) {
      this.tankTargets.set(sessionId, { x, y });
      const sprite = this.tankSprites.get(sessionId)!;
      if (isDead) sprite.setPosition(x, y);
      sprite.setVisible(!isDead);
      const nameText = this.tankNameTexts.get(sessionId);
      if (nameText) {
        nameText.setText(fullDisplayName);
        if (isDead) nameText.setPosition(x, y - GameScene.TANK_NAME_OFFSET);
        nameText.setVisible(!isDead);
      }
    } else {
      // Spawn new
      const sprite = this.createRoleShape(x, y, role, WORLD_DIMENSIONS.playerSize, teamColor);
      sprite.chassis.rotation = sprite.turret.rotation = tank.team === 'blue' ? Math.PI / 2 : -Math.PI / 2;
      const nameText = this.add.text(x, y - GameScene.TANK_NAME_OFFSET, fullDisplayName, {
        color: tank.team === 'blue' ? '#4d8dff' : '#ff4444',
        fontSize: '11px'
      }).setOrigin(0.5);
      sprite.setVisible(!isDead);
      nameText.setVisible(!isDead);
      this.tankSprites.set(sessionId, sprite);
      this.tankNameTexts.set(sessionId, nameText);
      console.log(`Spawned tank for ${sessionId} at ${x},${y}`);
      if (isMe) {
        this.cameras.main.startFollow(sprite, true, GameScene.CAMERA_LERP, GameScene.CAMERA_LERP);
      }
    }

    this.updateHealthBar(sessionId, x, y - GameScene.TANK_HEALTH_OFFSET, tank.hp, tank.maxHp, !isDead);

    if (sessionId === this.room.sessionId) {
      if (isDead) this.cancelRocketTargetSelection();
      const abilities = new Map<AbilityId, { level: number; cooldownEndsAt: number; cooldownMax: number; activeUntil: number }>();
      tank.abilities?.forEach((ability: any, abilityId: AbilityId) => {
        abilities.set(abilityId, {
          level: ability.level ?? 0,
          cooldownEndsAt: ability.cooldownEndsAt ?? 0,
          cooldownMax: ability.cooldownMax ?? 0,
          activeUntil: ability.activeUntil ?? 0
        });
      });
      this.myAbilityState = {
        role: tank.role,
        level: tank.level ?? 1,
        xp: tank.xp ?? 0,
        skillPoints: tank.skillPoints ?? 0,
        abilities
      };
    }
    if (isDead) {
      this.tankSprites.get(sessionId)?.updateAbilityVisuals(true, 0, 0, Date.now(), this.time.now);
      this.removeTargetFeedback(sessionId);
      if (isMe) this.cancelRocketTargetSelection();
    }
    this.applyTankVisibility(tank, sessionId);
    if (isMe) this.refreshRespawnCountdown();
  }

  private removeTank(sessionId: string) {
    this.visibleEntities.delete(sessionId);
    this.removeTargetFeedback(sessionId);
    if (sessionId === this.room?.sessionId) {
      this.cancelRocketTargetSelection();
      this.cameras.main.stopFollow();
      this.destroyRespawnCountdown();
    }
    this.tankSprites.get(sessionId)?.destroy();
    this.tankSprites.delete(sessionId);
    this.tankTargets.delete(sessionId);
    this.tankNameTexts.get(sessionId)?.destroy();
    this.tankNameTexts.delete(sessionId);
    const healthBar = this.healthBars.get(sessionId);
    healthBar?.bg.destroy();
    healthBar?.fill.destroy();
    this.healthBars.delete(sessionId);
    this.healEffectIcons.get(sessionId)?.destroy();
    this.healEffectIcons.delete(sessionId);
  }

  private upsertMinion(minion: Minion, id: string) {
    if (!minion) return;
    const x = minion.x ?? 0;
    const y = minion.y ?? 0;
    const sprite = this.minionSprites.get(id) ?? createMinionBeetle(
      this, x, y, minion.team === 'blue' ? 0x4d8dff : 0xff4444,
      getVehicleHeading({ x, y }, { x: minion.waypointX, y: minion.waypointY }, 0)
    );
    sprite.setDestination(x, y);
    this.minionSprites.set(id, sprite);
    this.updateHealthBar(id, sprite.x, sprite.y - GameScene.MINION_HEALTH_OFFSET, minion.hp, minion.maxHp, true);
    this.setEntityVisibility(id, this.canPresent(minion, sprite));
  }

  private upsertBase(base: Base, id: string) {
    if (!base) return;
    const x = base.x ?? 0;
    const y = base.y ?? 0;
    const sprite = this.baseSprites.get(id) ?? this.createBaseFortress(x, y, base.team);
    sprite.fort.setPosition(x, y);
    const target = base.targetId ? this.findEntityPosition(base.targetId) : null;
    sprite.cannon.rotation = getBaseCannonRotation(base.team, base, target);
    this.baseSprites.set(id, sprite);
    this.updateHealthBar(id, x, y - GameScene.BASE_HEALTH_OFFSET, base.hp, base.maxHp, true);
    const shot = getBaseCannonShotFeedback(base, this.baseShotCounts.get(id));
    this.baseShotCounts.set(id, base.shotCount);
    if (shot && this.visibleEntities.has(id) && this.canPresent(base)) {
      sprite.cannon.rotation = shot.angle;
      this.showBaseMuzzleFlash(id, shot.muzzle);
    }
    this.setEntityVisibility(id, this.canPresent(base));
  }

  private showBaseMuzzleFlash(id: string, muzzle: { x: number; y: number }) {
    const previous = this.baseMuzzleFlashes.get(id);
    if (previous) {
      this.tweens.killTweensOf(previous);
      previous.destroy();
    }
    const flash = this.add.circle(muzzle.x, muzzle.y, 10 * WORLD_SCALE.entity, 0xffe38a, 0.9).setDepth(3);
    this.baseMuzzleFlashes.set(id, flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 110,
      onComplete: () => {
        if (this.baseMuzzleFlashes.get(id) === flash) this.baseMuzzleFlashes.delete(id);
        flash.destroy();
      }
    });
  }

  private removeBase(id: string) {
    this.visibleEntities.delete(id);
    this.removeTargetFeedback(id);
    this.baseSprites.get(id)?.fort.destroy();
    this.baseSprites.delete(id);
    this.baseShotCounts.delete(id);
    const flash = this.baseMuzzleFlashes.get(id);
    if (flash) {
      this.tweens.killTweensOf(flash);
      flash.destroy();
      this.baseMuzzleFlashes.delete(id);
    }
    this.removeHealthBar(id);
  }

  private createBaseFortress(
    x: number,
    y: number,
    team: string
  ): { fort: Phaser.GameObjects.Container; cannon: Phaser.GameObjects.Container } {
    const teamColor = team === 'blue' ? 0x4d8dff : 0xff554d;
    const fort = this.add.container(x, y).setScale(WORLD_SCALE.entity);
    const stonePieces = [
      this.add.rectangle(0, 3, 76, 70, 0x292720).setStrokeStyle(3, 0x171613),
      this.add.rectangle(0, 0, 68, 62, 0x625b50).setStrokeStyle(2, 0x302c27),
      this.add.rectangle(0, 0, 42, 38, teamColor, 0.78).setStrokeStyle(2, 0x3b352e)
    ];
    for (const offsetX of [-24, 24]) {
      for (const offsetY of [-21, 21]) {
        stonePieces.push(
          this.add.rectangle(offsetX, offsetY, 18, 18, 0x81796b).setStrokeStyle(2, 0x39342d),
          this.add.rectangle(offsetX, offsetY, 11, 4, teamColor)
        );
      }
    }

    const cannon = this.add.container(0, 0);
    cannon.add([
      this.add.circle(0, 0, 18, 0x37342f).setStrokeStyle(3, 0x171613),
      this.add.circle(0, 0, 13, 0x9b8a69).setStrokeStyle(2, 0xd0bd91),
      this.add.rectangle(17, 0, 36, 11, 0x343638).setStrokeStyle(2, 0x17191a),
      this.add.rectangle(9, 0, 4, 14, teamColor),
      this.add.rectangle(34, 0, 5, 13, 0x1b1c1d)
    ]);
    fort.add([...stonePieces, cannon]);
    return { fort, cannon };
  }

  private upsertTower(tower: any, id: string) {
    if (!tower) return;
    const x = tower.x ?? 0;
    const y = tower.y ?? 0;
    const visual = this.towerSprites.get(id) ?? {};
    if (tower.hp <= 0) {
      visual.outpost?.destroy();
      visual.outpost = undefined;
      visual.cannon = undefined;
      this.removeHealthBar(id);
      const flash = this.towerMuzzleFlashes.get(id);
      if (flash) {
        this.tweens.killTweensOf(flash);
        flash.destroy();
        this.towerMuzzleFlashes.delete(id);
      }
      if (!visual.ruin) visual.ruin = this.createTowerRuin(x, y);
      else visual.ruin.setPosition(x, y);
      this.towerSprites.set(id, visual);
      this.towerShotCounts.set(id, tower.shotCount ?? 0);
      this.setEntityVisibility(id, this.canPresent(tower, undefined, true));
      return;
    }
    if (visual.ruin) {
      visual.ruin.destroy();
      visual.ruin = undefined;
    }
    if (!visual.outpost || !visual.cannon) {
      const created = this.createTowerOutpost(x, y, tower.team);
      visual.outpost = created.outpost;
      visual.cannon = created.cannon;
    }
    visual.outpost.setPosition(x, y);
    const target = tower.targetId ? this.findEntityPosition(tower.targetId) : null;
    visual.cannon.rotation = getTowerCannonRotation(tower.team, tower, target);
    this.towerSprites.set(id, visual);
    this.updateHealthBar(id, x, y - GameScene.TOWER_HEALTH_OFFSET, tower.hp, tower.maxHp, true);
    const shot = getTowerCannonShotFeedback(tower, this.towerShotCounts.get(id));
    this.towerShotCounts.set(id, tower.shotCount ?? 0);
    if (shot && this.visibleEntities.has(id) && this.canPresent(tower)) {
      visual.cannon.rotation = shot.angle;
      this.showTowerMuzzleFlash(id, shot.muzzle);
    }
    this.setEntityVisibility(id, this.canPresent(tower));
  }

  private createTowerOutpost(
    x: number,
    y: number,
    team: string
  ): { outpost: Phaser.GameObjects.Container; cannon: Phaser.GameObjects.Container } {
    const teamColor = team === 'blue' ? 0x4d8dff : 0xff554d;
    const outpost = this.add.container(x, y).setScale(WORLD_SCALE.entity);
    const stonePieces = [
      this.add.rectangle(0, 2, 42, 38, 0x292720).setStrokeStyle(2, 0x171613),
      this.add.rectangle(0, 0, 36, 32, 0x625b50).setStrokeStyle(1, 0x302c27),
      this.add.rectangle(0, 0, 24, 22, teamColor, 0.78).setStrokeStyle(1, 0x3b352e)
    ];
    for (const offsetX of [-13, 13]) {
      for (const offsetY of [-11, 11]) {
        stonePieces.push(
          this.add.rectangle(offsetX, offsetY, 10, 9, 0x81796b).setStrokeStyle(1, 0x39342d),
          this.add.rectangle(offsetX, offsetY, 7, 2, teamColor)
        );
      }
    }
    const cannon = this.add.container(0, 0);
    cannon.add([
      this.add.circle(0, 0, 9, 0x37342f).setStrokeStyle(2, 0x171613),
      this.add.circle(0, 0, 6, 0x9b8a69).setStrokeStyle(1, 0xd0bd91),
      this.add.rectangle(10, 0, 21, 6, 0x343638).setStrokeStyle(1, 0x17191a),
      this.add.rectangle(5, 0, 3, 9, teamColor),
      this.add.rectangle(20, 0, 3, 8, 0x1b1c1d)
    ]);
    outpost.add([...stonePieces, cannon]);
    return { outpost, cannon };
  }

  private createTowerRuin(x: number, y: number): Phaser.GameObjects.Graphics {
    const ruin = this.add.graphics().setPosition(x, y).setDepth(-0.25).setScale(WORLD_SCALE.entity);
    ruin.fillStyle(0x35332f, 0.95);
    ruin.fillRect(-19, -8, 38, 18);
    ruin.fillStyle(0x625b50, 1);
    ruin.fillRect(-15, -13, 11, 11);
    ruin.fillRect(3, -12, 13, 9);
    ruin.fillRect(-7, 2, 14, 8);
    ruin.fillStyle(0x292720, 1);
    ruin.fillRect(-18, 7, 12, 5);
    ruin.fillRect(8, -2, 10, 5);
    ruin.lineStyle(2, 0x171613, 0.9);
    ruin.beginPath();
    ruin.moveTo(-4, -8);
    ruin.lineTo(0, -2);
    ruin.lineTo(-3, 3);
    ruin.strokePath();
    return ruin;
  }

  private showTowerMuzzleFlash(id: string, muzzle: { x: number; y: number }) {
    const previous = this.towerMuzzleFlashes.get(id);
    if (previous) {
      this.tweens.killTweensOf(previous);
      previous.destroy();
    }
    const flash = this.add.circle(muzzle.x, muzzle.y, 6 * WORLD_SCALE.entity, 0xffe38a, 0.9).setDepth(3);
    this.towerMuzzleFlashes.set(id, flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 110,
      onComplete: () => {
        if (this.towerMuzzleFlashes.get(id) === flash) this.towerMuzzleFlashes.delete(id);
        flash.destroy();
      }
    });
  }

  private removeMinion(id: string) {
    this.visibleEntities.delete(id);
    this.removeTargetFeedback(id);
    this.minionSprites.get(id)?.destroy();
    this.minionSprites.delete(id);
    this.removeHealthBar(id);
  }

  private removeTower(id: string) {
    this.visibleEntities.delete(id);
    this.removeTargetFeedback(id);
    const visual = this.towerSprites.get(id);
    visual?.outpost?.destroy();
    visual?.ruin?.destroy();
    this.towerSprites.delete(id);
    this.towerShotCounts.delete(id);
    const flash = this.towerMuzzleFlashes.get(id);
    if (flash) {
      this.tweens.killTweensOf(flash);
      flash.destroy();
      this.towerMuzzleFlashes.delete(id);
    }
    this.removeHealthBar(id);
  }

  private removeTargetFeedback(id: string) {
    this.attackMarkers = this.attackMarkers.filter(marker => {
      if (marker.targetId !== id) return true;
      this.tweens.killTweensOf(marker.graphics);
      marker.graphics.destroy();
      return false;
    });
  }

  private upsertProjectile(projectile: Projectile, id: string) {
    if (!projectile) return;
    const x = projectile.x ?? 0;
    const y = projectile.y ?? 0;
    const sprite = this.projectileSprites.get(id) ?? this.add.circle(
      x,
      y,
      projectile.isMortar ? 12 : 4,
      projectile.isMortar ? 0x202632 : projectile.team === 'blue' ? 0x99ccff : 0xffcc99
    ).setDepth(projectile.isMortar ? 910 : 2);
    if (projectile.isMortar) {
      sprite.setStrokeStyle(2, 0xffdd88);
      const shadow = this.mortarShadows.get(id) ?? this.add.ellipse(x, y, 22, 10, 0x000000, 0.5).setDepth(901);
      shadow.setPosition(x, y).setVisible(isProjectilePresented(projectile, this.vision));
      this.mortarShadows.set(id, shadow);
      if (projectile.team === this.vision.team) {
        const marker = this.mortarLandingMarkers.get(id) ?? this.add.circle(
          projectile.landingX, projectile.landingY, projectile.blastRadius, 0xff7744, 0.04
        ).setStrokeStyle(2, 0xffaa66, 0.6).setDepth(902);
        marker.setPosition(projectile.landingX, projectile.landingY);
        this.mortarLandingMarkers.set(id, marker);
      }
    }
    sprite.x = x;
    sprite.y = y - (projectile.isMortar ? mortarShellHeight(projectile.flightProgress) : 0);
    this.projectileSprites.set(id, sprite);
    sprite.setVisible(isProjectilePresented(projectile, this.vision));
  }

  private removeProjectile(id: string) {
    this.projectileSprites.get(id)?.destroy();
    this.projectileSprites.delete(id);
    this.mortarShadows.get(id)?.destroy();
    this.mortarShadows.delete(id);
    this.mortarLandingMarkers.get(id)?.destroy();
    this.mortarLandingMarkers.delete(id);
  }

  private showMortarImpact(impact: MortarImpactMessage) {
    if (this.seenMortarImpacts.has(impact.shotId)) return;
    this.seenMortarImpacts.add(impact.shotId);
    const blast = this.add.circle(impact.x, impact.y, impact.radius, 0xffa23a, 0.35)
      .setStrokeStyle(4, 0xffe6a0).setDepth(920);
    this.mortarImpacts.set(impact.shotId, blast);
    this.tweens.add({
      targets: blast, alpha: 0, duration: 450,
      onComplete: () => {
        blast.destroy();
        this.mortarImpacts.delete(impact.shotId);
      }
    });
  }

  private clearMortarPresentation() {
    for (const id of [...this.mortarShadows.keys()]) this.removeProjectile(id);
    this.mortarLandingMarkers.forEach((marker) => marker.destroy());
    this.mortarLandingMarkers.clear();
    this.mortarImpacts.forEach((blast) => {
      this.tweens.killTweensOf(blast);
      blast.destroy();
    });
    this.mortarImpacts.clear();
    this.seenMortarImpacts.clear();
  }

  private hpRatio(hp: number, maxHp: number): number {
    if (!maxHp) return 0;
    return Math.max(0, Math.min(1, hp / maxHp));
  }

  /** Repositions an existing health bar to follow its tank's current (interpolated) screen position, without altering fill/visibility. */
  private updateHealthBarPosition(id: string, x: number, y: number) {
    const bar = this.healthBars.get(id);
    if (!bar) return;
    bar.bg.setPosition(x, y);
    bar.fill.setPosition(x - bar.width / 2, y);
  }

  private updateHealthBar(id: string, x: number, y: number, hp: number, maxHp: number, visible: boolean) {
    const barWidth = 36;
    const bar = this.healthBars.get(id);
    const fillWidth = barWidth * this.hpRatio(hp, maxHp);
    if (bar) {
      bar.bg.setPosition(x, y);
      bar.fill.setPosition(x - barWidth / 2, y);
      bar.fill.width = fillWidth;
      bar.bg.setVisible(visible);
      bar.fill.setVisible(visible);
      return;
    }
    const bg = this.add.rectangle(x, y, barWidth, 5, 0x330000).setOrigin(0.5).setVisible(visible);
    const fill = this.add.rectangle(x - barWidth / 2, y, fillWidth, 5, 0x33cc33).setOrigin(0, 0.5).setVisible(visible);
    this.healthBars.set(id, { bg, fill, width: barWidth });
  }

  private removeHealthBar(id: string) {
    const bar = this.healthBars.get(id);
    bar?.bg.destroy();
    bar?.fill.destroy();
    this.healthBars.delete(id);
  }

  private hitTestClick(worldX: number, worldY: number): { id: string; team: string; x: number; y: number } | null {
    let closest: { id: string; team: string; x: number; y: number; distSq: number } | null = null;
    const consider = (id: string, x: number, y: number, team: string, radius: number) => {
      if (!this.visibleEntities.has(id)) return;
      const dx = x - worldX;
      const dy = y - worldY;
      const distSq = dx * dx + dy * dy;
      if (distSq > radius * radius) return;
      if (!closest || distSq < closest.distSq) closest = { id, team, x, y, distSq };
    };
    this.room.state.tanks.forEach((tank: any, sessionId: string) => {
      if (tank.state === 'dead') return;
      consider(sessionId, tank.x, tank.y, tank.team, GameScene.CLICK_HIT_RADIUS_TANK);
    });
    this.room.state.minions.forEach((minion: any, id: string) => {
      consider(id, minion.x, minion.y, minion.team, GameScene.CLICK_HIT_RADIUS_MINION);
    });
    this.room.state.bases.forEach((base: any, id: string) => {
      if (base.hp <= 0) return;
      consider(id, base.x, base.y, base.team, GameScene.CLICK_HIT_RADIUS_BASE);
    });
    this.room.state.towers.forEach((tower: any, id: string) => {
      if (tower.hp <= 0) return;
      consider(id, tower.x, tower.y, tower.team, GameScene.CLICK_HIT_RADIUS_TOWER);
    });
    return closest;
  }

  /** Tank targets follow their rendered center, including positional interpolation. */
  private findEntityPosition(id: string): { x: number; y: number } | null {
    if (!this.visibleEntities.has(id)) return null;
    const tank = this.room.state.tanks.get(id) as any;
    if (tank) {
      if (tank.state === 'dead') return null;
      const sprite = this.tankSprites.get(id);
      return sprite ? { x: sprite.x, y: sprite.y } : { x: tank.x, y: tank.y };
    }
    const minion = this.room.state.minions.get(id) as any;
    if (minion) {
      const sprite = this.minionSprites.get(id);
      return sprite ? { x: sprite.x, y: sprite.y } : { x: minion.x, y: minion.y };
    }
    const base = this.room.state.bases.get(id) as any;
    if (base && base.hp > 0) return { x: base.x, y: base.y };
    const tower = this.room.state.towers.get(id) as any;
    if (tower && tower.hp > 0) return { x: tower.x, y: tower.y };
    return null;
  }

  private createCrossGraphics(color: number): Phaser.GameObjects.Graphics {
    const size = 10;
    const marker = this.add.graphics().setDepth(1000);
    marker.lineStyle(3, color, 1);
    marker.beginPath();
    marker.moveTo(-size, -size);
    marker.lineTo(size, size);
    marker.moveTo(size, -size);
    marker.lineTo(-size, size);
    marker.strokePath();
    return marker;
  }

  /** Draws a short-lived cross at a fixed point (used for a move command) that fades out after ~1 second. */
  private showClickMarker(x: number, y: number, color: number) {
    const marker = this.createCrossGraphics(color).setPosition(x, y);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      duration: GameScene.CLICK_MARKER_DURATION_MS,
      onComplete: () => marker.destroy()
    });
  }

  /** Draws a short-lived cross centered on an attack target, that re-centers on the target's live position every frame until it fades out after ~1 second. */
  private showAttackMarker(targetId: string, x: number, y: number, color: number) {
    const marker = this.createCrossGraphics(color).setPosition(x, y).setScale(WORLD_SCALE.entity);
    const entry = { graphics: marker, targetId };
    this.attackMarkers.push(entry);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      duration: GameScene.CLICK_MARKER_DURATION_MS,
      onComplete: () => {
        marker.destroy();
        this.attackMarkers = this.attackMarkers.filter((m) => m !== entry);
      }
    });
  }

  private handlePointerClick(pointer: Phaser.Input.Pointer) {
    if (this.weaponSelection && shouldCancelRocketTargetSelection(pointer.button)) {
      this.cancelRocketTargetSelection();
      return;
    }
    if (this.fog?.contains(pointer)) return;
    if (pointer.button !== 0 || !this.arenaStarted || !this.room || this.room.state.phase !== 'started') return;
    if (pointer.y >= this.scale.height - GameScene.HUD_BAR_HEIGHT) return; // clicks on the HUD bar are not movement/attack commands
    const myTank = this.room.state.tanks.get(this.room.sessionId) as any;
    if (!myTank || myTank.state === 'dead') return;
    pointer.updateWorldPoint?.(this.cameras.main);
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const hit = this.weaponSelection === 'mortar' ? null : this.hitTestClick(worldX, worldY);
    const action = resolveArenaClick(
      this.weaponSelection,
      { team: myTank.team, x: myTank.x, y: myTank.y },
      hit,
      { x: worldX, y: worldY },
      getAbilityDefinition('damagedealer-homing-rocket').config.range ?? 0
    );
    if (action.type === 'rocket') {
      this.sendAbilityActivation({ abilityId: 'damagedealer-homing-rocket', targetId: action.targetId });
      this.cancelRocketTargetSelection();
    } else if (action.type === 'mortar') {
      this.sendAbilityActivation({ abilityId: 'damagedealer-mortar', targetX: action.x, targetY: action.y });
      this.cancelRocketTargetSelection();
    } else if (action.type === 'attack') {
      this.room.send('command', { targetId: action.targetId });
      this.showAttackMarker(action.targetId, action.x, action.y, 0xff3333);
    } else if (action.type === 'move') {
      this.room.send('command', { x: action.x, y: action.y });
      this.showClickMarker(action.x, action.y, 0x33ff55);
    } else if (this.weaponSelection === 'mortar') {
      this.statusText.setText('Choose an arena point within 900 range.').setColor('#ffbb88');
    }
  }

  update(_time: number = 0, delta: number = 1000 / 60) {
    this.minionSprites.forEach((sprite, id) => {
      sprite.updateMotion(delta);
      this.updateHealthBarPosition(id, sprite.x, sprite.y - GameScene.MINION_HEALTH_OFFSET);
    });
    this.tankTargets.forEach((target, sessionId) => {
      const sprite = this.tankSprites.get(sessionId);
      if (sprite) {
        if (sprite.visible) {
          sprite.chassis.rotation = getVehicleHeading(sprite, target, sprite.chassis.rotation);
        }
        sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.25);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.25);
        this.tankNameTexts.get(sessionId)?.setPosition(sprite.x, sprite.y - GameScene.TANK_NAME_OFFSET);
        this.updateHealthBarPosition(sessionId, sprite.x, sprite.y - GameScene.TANK_HEALTH_OFFSET);
      }
    });
    this.applyVisibility();
    if (this.arenaStarted && this.room) {
      this.room.state.minions.forEach((minion, id) => {
        const target = minion.targetId ? this.findEntityPosition(minion.targetId) : null;
        this.minionSprites.get(id)?.aimAt(target);
      });
      this.room.state.tanks.forEach((tank, sessionId) => {
        const sprite = this.tankSprites.get(sessionId);
        if (!sprite?.visible) return;
        const target = tank.targetId ? this.findEntityPosition(tank.targetId) : null;
        const heading = getVehicleHeading(sprite, target, sprite.chassis.rotation);
        sprite.turret.rotation = getSmoothedHeading(sprite.turret.rotation, heading, delta);
      });
    }
    this.attackMarkers.forEach(({ graphics, targetId }) => {
      const position = this.findEntityPosition(targetId);
      if (position) graphics.setPosition(position.x, position.y);
      else {
        this.tweens.killTweensOf(graphics);
        graphics.destroy();
      }
    });
    this.attackMarkers = this.attackMarkers.filter(({ graphics }) => graphics.active);
    this.refreshAbilityHud();
    this.refreshWeaponTargeting();
    this.applyRoleAbilityVisuals();
    this.applyVisibility();
    this.refreshRespawnCountdown();
  }

  private destroyRespawnCountdown() {
    this.respawnCountdown?.destroy();
    this.respawnCountdown = undefined;
  }

  private refreshRespawnCountdown() {
    const tank = this.room?.state.tanks.get(this.room.sessionId);
    const sprite = this.tankSprites.get(this.room?.sessionId);
    const text = getRespawnCountdown(tank, true, this.room?.state.phase ?? '', Date.now());
    if (!this.arenaStarted || this.resultsShown || text === null || !sprite?.visible) {
      this.destroyRespawnCountdown();
      return;
    }
    if (!this.respawnCountdown) {
      this.respawnCountdown = this.add.text(0, 0, '', {
        color: '#ffffff', fontSize: '16px', fontStyle: 'bold',
        backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(WORLD_FOG_DEPTH + 3);
    }
    this.respawnCountdown.setText(text).setPosition(sprite.x, sprite.y - 68 * WORLD_SCALE.entity);
  }

  private rebuildVision() {
    if (!this.room) return;
    const team = this.room.state.tanks.get(this.room.sessionId)?.team
      ?? this.room.state.playerStats.get(this.room.sessionId)?.team ?? '';
    this.vision = new TeamVision(team, getVisionEntities(this.room.state));
  }

  private refreshFog() {
    if (!this.fog || !this.room) return;
    const state = this.room.state;
    this.fog.update(this.vision, [
      ...state.tanks.values(), ...state.minions.values(), ...state.towers.values(), ...state.bases.values()
    ], this.room.sessionId);
  }

  private canPresent(entity: VisionEntity, rendered?: { x: number; y: number }, ruin = false): boolean {
    return isEntityPresented(entity, this.vision, rendered, ruin);
  }

  private setEntityVisibility(id: string, visible: boolean) {
    this.tankSprites.get(id)?.setVisible(visible);
    this.tankNameTexts.get(id)?.setVisible(visible);
    this.minionSprites.get(id)?.setVisible(visible);
    this.baseSprites.get(id)?.fort.setVisible(visible);
    const tower = this.towerSprites.get(id);
    tower?.outpost?.setVisible(visible);
    tower?.ruin?.setVisible(visible);
    const bar = this.healthBars.get(id);
    bar?.bg.setVisible(visible);
    bar?.fill.setVisible(visible);
    this.healEffectIcons.get(id)?.setVisible(visible);
    this.baseMuzzleFlashes.get(id)?.setVisible(visible);
    this.towerMuzzleFlashes.get(id)?.setVisible(visible);
    if (!visible) {
      for (const flashes of [this.baseMuzzleFlashes, this.towerMuzzleFlashes]) {
        const flash = flashes.get(id);
        if (!flash) continue;
        this.tweens.killTweensOf(flash);
        flash.destroy();
        flashes.delete(id);
      }
    }
    if (visible) this.visibleEntities.add(id);
    else this.visibleEntities.delete(id);
  }

  private applyVisibility() {
    if (!this.room || !this.arenaStarted || this.resultsShown) return;
    const state = this.room.state;
    state.tanks.forEach((tank, id) => this.applyTankVisibility(tank, id));
    state.minions.forEach((minion, id) => this.setEntityVisibility(id, this.canPresent(minion, this.minionSprites.get(id))));
    state.bases.forEach((base, id) => this.setEntityVisibility(id, this.canPresent(base)));
    state.towers.forEach((tower, id) => this.setEntityVisibility(id, this.canPresent(tower, undefined, tower.hp <= 0)));
    state.projectiles.forEach((projectile, id) => {
      const visible = isProjectilePresented(projectile, this.vision);
      this.projectileSprites.get(id)?.setVisible(visible);
      this.mortarShadows.get(id)?.setVisible(visible);
    });
  }

  private applyTankVisibility(tank: Tank, id: string) {
    const sprite = this.tankSprites.get(id);
    const presentation = getTankPresentation(tank, this.vision, sprite);
    const preview = presentation.visible && tank.state === 'dead';
    this.setEntityVisibility(id, presentation.combatVisible);
    sprite?.setVisible(presentation.visible).setAlpha(presentation.alpha).setDepth(preview ? WORLD_FOG_DEPTH + 1 : 0);
    this.tankNameTexts.get(id)?.setVisible(presentation.visible).setDepth(preview ? WORLD_FOG_DEPTH + 2 : 0);
  }

  /** Updates healer service marks, exhaust and the repair tool over healed allies without surrounding rings. */
  private applyRoleAbilityVisuals() {
    if (!this.arenaStarted || !this.room || this.resultsShown) return;
    const now = Date.now();
    const healRadius = getAbilityDefinition('healer-aura').config.radius ?? 0;
    const healedSessionIds = new Set<string>();

    this.room.state.tanks.forEach((healerTank: any, healerId: string) => {
      if (healerTank.role !== 'healer' || healerTank.state === 'dead') return;
      if (now >= (healerTank.abilities?.get('healer-aura')?.activeUntil ?? 0)) return;
      this.room.state.tanks.forEach((allyTank: any, allyId: string) => {
        if (allyTank.team !== healerTank.team || allyTank.state === 'dead') return;
        const dx = (allyTank.x ?? 0) - (healerTank.x ?? 0);
        const dy = (allyTank.y ?? 0) - (healerTank.y ?? 0);
        if (dx * dx + dy * dy <= healRadius * healRadius) healedSessionIds.add(allyId);
      });
    });

    this.room.state.tanks.forEach((tank: any, sessionId: string) => {
      const sprite = this.tankSprites.get(sessionId);
      if (!sprite) return;
      sprite.updateAbilityVisuals(
        tank.state === 'dead',
        tank.abilities?.get('healer-aura')?.activeUntil ?? 0,
        tank.abilities?.get('healer-speed')?.activeUntil ?? 0,
        now,
        this.time.now
      );
    });

    healedSessionIds.forEach((sessionId) => {
      if (this.healEffectIcons.has(sessionId)) return;
      const icon = this.add.graphics().setDepth(500).setScale(WORLD_SCALE.entity);
      drawWrench(icon, 0, 0, 22);
      this.healEffectIcons.set(sessionId, icon);
    });
    Array.from(this.healEffectIcons.keys()).forEach((sessionId) => {
      if (healedSessionIds.has(sessionId)) return;
      this.healEffectIcons.get(sessionId)?.destroy();
      this.healEffectIcons.delete(sessionId);
    });
    const t = this.time.now;
    this.healEffectIcons.forEach((icon, sessionId) => {
      const sprite = this.tankSprites.get(sessionId);
      if (!sprite) return;
      const bob = Math.sin((t + sessionId.length * 137) / 260) * 5 * WORLD_SCALE.entity;
      icon.setPosition(sprite.x, sprite.y - 68 * WORLD_SCALE.entity + bob);
    });
  }

  /** Sends the request to spend one skill point on a specific role ability. */
  private upgradeAbility(abilityId: AbilityId) {
    if (!this.arenaStarted || !this.room || this.room.state.phase !== 'started') return;
    const myTank = this.room.state.tanks.get(this.room.sessionId) as any;
    if (!myTank || myTank.state === 'dead') return;
    if ((myTank.skillPoints ?? 0) < 1) return;
    const ability = myTank.abilities?.get(abilityId);
    if (!ability || ability.level >= MAX_ABILITY_LEVEL) return;
    this.room.send('upgrade_ability', { abilityId });
  }

  /** Creates the progression panel and each independent role-ability control. */
  private createAbilityHud() {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const uiScale = this.viewportScale();
    const barHeight = GameScene.HUD_BAR_HEIGHT;
    const barTop = gameHeight - barHeight;
    const barCenterY = barTop + barHeight / 2;
    const bar = this.add.rectangle(gameWidth / 2, barCenterY, gameWidth, barHeight, 0x0b0d10, 0.95).setDepth(2000).setScrollFactor(0);
    const barBorder = this.add.rectangle(gameWidth / 2, barTop, gameWidth, 3, 0x3a4a63, 1).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0);

    // Left section: Level, XP Progress Bar, and Unspent Skill Points
    const levelText = this.add.text(this.viewportX(20), barTop + 12, 'LVL 1', {
      color: '#ffdd55',
      fontSize: '18px',
      fontStyle: 'bold'
    }).setOrigin(0, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);

    const xpBarX = this.viewportX(20);
    const xpBarY = barTop + 42;
    const xpBarWidth = 150;
    const xpBarHeight = 14;

    const xpBarBg = this.add.rectangle(xpBarX, xpBarY, xpBarWidth, xpBarHeight, 0x1a2230, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4a63)
      .setDepth(2001)
      .setScrollFactor(0)
      .setScale(uiScale);

    const xpBarFill = this.add.rectangle(xpBarX, xpBarY, 0, xpBarHeight, 0x00bbff, 1)
      .setOrigin(0, 0)
      .setDepth(2002)
      .setScrollFactor(0)
      .setScale(uiScale);

    const xpText = this.add.text(this.viewportX(176), xpBarY - 1, '0 / 100 XP', {
      color: '#cfe8ff',
      fontSize: '12px',
      fontStyle: 'bold'
    }).setOrigin(0, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);

    const skillPointsText = this.add.text(this.viewportX(20), barTop + 64, 'Skill Points: 0', {
      color: '#88ffaa',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(0, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);

    const role = this.room?.state.tanks.get(this.room.sessionId)?.role;
    const abilityIds = ROLE_ABILITY_IDS[isRole(role) ? role : 'healer'];
    const createSlot = (index: number, abilityId: AbilityId) => {
      const designX = getAbilitySlotDesignX(index, abilityIds.length);
      const slotCenterX = this.viewportX(designX);
      const slotSize = 42;
      const slotTop = barCenterY - slotSize * uiScale / 2;
      const slotBg = this.add.rectangle(this.viewportX(designX - 50), barCenterY, slotSize, slotSize, 0x1c2430, 0.9)
        .setStrokeStyle(2, 0xffffff).setDepth(2001).setScrollFactor(0).setScale(uiScale).setInteractive({ useHandCursor: true });
      const icon = this.add.graphics().setDepth(2002).setScrollFactor(0);
      const cooldownOverlay = this.add.rectangle(this.viewportX(designX - 50), slotTop, slotSize, 0, 0x000000, 0.65)
        .setOrigin(0.5, 0).setDepth(2003).setScrollFactor(0).setScale(uiScale);
      const titleText = this.add.text(slotCenterX, barTop + 4, '', {
        color: '#ffffff', fontSize: '11px', fontStyle: 'bold'
      }).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);
      const abilityLevelText = this.add.text(slotCenterX, barTop + 22, 'Locked', {
        color: '#aaaaaa', fontSize: '11px', fontStyle: 'bold'
      }).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);
      const statusText = this.add.text(slotCenterX, barTop + 40, '', {
        color: '#cfe8ff', fontSize: '10px'
      }).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0).setScale(uiScale);
      const upgradeButtonBg = this.add.rectangle(this.viewportX(designX + 25), barTop + 71, 104, 22, 0x225533, 0.9)
        .setStrokeStyle(1, 0x44bb66).setDepth(2001).setScrollFactor(0).setScale(uiScale).setInteractive({ useHandCursor: true });
      const upgradeButtonText = this.add.text(this.viewportX(designX + 25), barTop + 71, 'Learn (1 SP)', {
        color: '#ffffff', fontSize: '11px', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setScale(uiScale);
      const slot = {
        abilityId, slotBg, icon, cooldownOverlay, titleText, statusText, abilityLevelText,
        upgradeButtonBg, upgradeButtonText, slotSize, slotTop, slotCenterX, abilityLearned: null as boolean | null
      };
      slotBg.on('pointerdown', (pointer?: Phaser.Input.Pointer) => {
        if (!pointer || pointer.button === 0) this.activateAbility(slot.abilityId);
      });
      upgradeButtonBg.on('pointerdown', (pointer?: Phaser.Input.Pointer) => {
        if (!pointer || pointer.button === 0) this.upgradeAbility(slot.abilityId);
      });
      return slot;
    };

    this.abilityHud = {
      bar,
      barBorder,
      levelText,
      xpBarBg,
      xpBarFill,
      xpText,
      skillPointsText,
      slots: abilityIds.map((abilityId, index) => createSlot(index, abilityId))
    };
    this.rocketTargetHint = this.add.text(gameWidth / 2, 26, 'Select a rocket target (Esc/right-click to cancel)', {
      color: '#ffffff', fontSize: '14px', fontStyle: 'bold', backgroundColor: '#7a251dcc', padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setScale(uiScale).setVisible(false);
  }

  private destroyAbilityHud() {
    this.healEffectIcons.forEach((icon) => icon.destroy());
    this.healEffectIcons.clear();
    this.cancelRocketTargetSelection();
    this.mortarPreview?.destroy();
    this.mortarPreview = undefined;
    this.rocketTargetHint?.destroy();
    this.rocketTargetHint = undefined;
    if (!this.abilityHud) return;
    this.abilityHud.bar.destroy();
    this.abilityHud.barBorder.destroy();
    this.abilityHud.levelText.destroy();
    this.abilityHud.xpBarBg.destroy();
    this.abilityHud.xpBarFill.destroy();
    this.abilityHud.xpText.destroy();
    this.abilityHud.skillPointsText.destroy();
    this.abilityHud.slots.forEach((slot) => {
      slot.slotBg.destroy();
      slot.icon.destroy();
      slot.cooldownOverlay.destroy();
      slot.titleText.destroy();
      slot.statusText.destroy();
      slot.abilityLevelText.destroy();
      slot.upgradeButtonBg.destroy();
      slot.upgradeButtonText.destroy();
    });
    this.abilityHud = undefined;
    this.myAbilityState = null;
  }

  /** Draws a stylized shield glyph (tank) centered at cx/cy within the given icon size. */
  private drawShieldIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    const w = size * 0.7;
    const h = size * 0.9;
    g.lineStyle(4, 0xffffff, 1);
    g.fillStyle(0xffffff, 0.15);
    g.beginPath();
    g.moveTo(cx - w / 2, cy - h / 2 + h * 0.15);
    g.lineTo(cx - w / 2, cy + h * 0.1);
    g.lineTo(cx, cy + h / 2);
    g.lineTo(cx + w / 2, cy + h * 0.1);
    g.lineTo(cx + w / 2, cy - h / 2 + h * 0.15);
    g.lineTo(cx, cy - h / 2);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  /** Draws stacked dashed lines (damagedealer) symbolizing rapid shots, centered at cx/cy within the given icon size. */
  private drawRapidFireIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    g.lineStyle(4, 0xffffff, 1);
    const dashLen = size * 0.55;
    const gapY = size * 0.28;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(cx - dashLen / 2, cy + i * gapY);
      g.lineTo(cx + dashLen / 2, cy + i * gapY);
      g.strokePath();
    }
  }

  /** Draws a glyph for the selected ability. */
  private drawAbilityIcon(g: Phaser.GameObjects.Graphics, abilityId: AbilityId, cx: number, cy: number, size: number) {
    g.clear();
    if (abilityId === 'healer-aura') drawWrench(g, cx, cy, size);
    else if (abilityId === 'healer-speed') {
      g.fillStyle(0xffffff, 1);
      g.beginPath();
      g.moveTo(cx + 2, cy - size * 0.45);
      g.lineTo(cx - size * 0.35, cy + 1);
      g.lineTo(cx - 1, cy + 1);
      g.lineTo(cx - 5, cy + size * 0.45);
      g.lineTo(cx + size * 0.35, cy - 4);
      g.lineTo(cx + 3, cy - 4);
      g.closePath();
      g.fillPath();
    } else if (abilityId === 'tank-shield' || abilityId === 'tank-entrench') {
      this.drawShieldIcon(g, cx, cy, size);
      if (abilityId === 'tank-entrench') {
        g.lineStyle(3, 0xffffff, 1);
        g.lineBetween(cx - size * 0.25, cy + size * 0.25, cx + size * 0.25, cy + size * 0.25);
      }
    } else if (abilityId === 'damagedealer-mortar') {
      const scale = size / 42;
      g.fillStyle(0x202632).fillCircle(cx, cy + 2 * scale, size * 0.3);
      g.lineStyle(2 * scale, 0xffdd88).strokeCircle(cx, cy + 2 * scale, size * 0.3);
      g.lineStyle(3 * scale, 0xffaa33).lineBetween(cx + 5 * scale, cy - 8 * scale, cx + 9 * scale, cy - 14 * scale);
      g.lineBetween(cx + 9 * scale, cy - 14 * scale, cx + 15 * scale, cy - 12 * scale);
    } else if (abilityId === 'damagedealer-rapidfire') this.drawRapidFireIcon(g, cx, cy, size);
    else {
      g.fillStyle(0xffffff, 1);
      g.beginPath();
      g.moveTo(cx + size * 0.45, cy);
      g.lineTo(cx - size * 0.35, cy - size * 0.25);
      g.lineTo(cx - size * 0.2, cy);
      g.lineTo(cx - size * 0.35, cy + size * 0.25);
      g.closePath();
      g.fillPath();
      g.lineStyle(3, 0xffffff, 1);
      g.lineBetween(cx - size * 0.15, cy, cx - size * 0.48, cy);
    }
  }

  private activateRoleAbility(index: number) {
    const state = this.myAbilityState;
    if (!state) return;
    const abilityId = getRoleAbilityAtIndex(state.role, index);
    if (abilityId) this.activateAbility(abilityId);
  }

  private sendAbilityActivation(request: AbilityActivationRequest) {
    this.room.send('activate_ability', request);
  }

  /** Targeted weapons select first; other learned abilities activate immediately. */
  private activateAbility(abilityId: AbilityId) {
    if (!this.arenaStarted || !this.room || this.room.state.phase !== 'started') return;
    const myTank = this.room.state.tanks.get(this.room.sessionId) as any;
    if (!myTank || myTank.state === 'dead') return;
    const ability = myTank.abilities?.get(abilityId);
    if (!ability || ability.level <= 0 || Date.now() < ability.cooldownEndsAt) return;
    if (abilityId === 'damagedealer-homing-rocket' || abilityId === 'damagedealer-mortar') {
      this.weaponSelection = nextWeaponSelection(this.weaponSelection, abilityId === 'damagedealer-mortar' ? 'mortar' : 'rocket');
      if (this.weaponSelection) this.refreshWeaponTargeting();
      else this.cancelRocketTargetSelection();
      return;
    }
    this.cancelRocketTargetSelection();
    this.sendAbilityActivation({ abilityId });
  }

  private cancelRocketTargetSelection() {
    this.weaponSelection = null;
    this.rocketTargetHint?.setVisible(false);
    this.mortarPreview?.clear();
    applyWeaponCursor(this.game.canvas, null);
  }

  private refreshWeaponTargeting() {
    if (!this.weaponSelection) return;
    const tank = this.room?.state.tanks.get(this.room.sessionId);
    if (!this.arenaStarted || this.room?.state.phase !== 'started' || !tank || tank.state === 'dead') {
      this.cancelRocketTargetSelection();
      return;
    }
    applyWeaponCursor(this.game.canvas, this.weaponSelection);
    this.rocketTargetHint?.setVisible(true).setText(this.weaponSelection === 'mortar'
      ? 'Select Mortar ground point (Esc/right-click to cancel)'
      : 'Select a rocket target (Esc/right-click to cancel)');
    this.mortarPreview?.clear();
    if (this.weaponSelection !== 'mortar') return;
    const pointer = this.input.activePointer;
    const point = pointer.updateWorldPoint(this.cameras.main);
    const config = getAbilityDefinition('damagedealer-mortar').config;
    const preview = this.mortarPreview ?? this.add.graphics().setDepth(950);
    this.mortarPreview = preview;
    preview.lineStyle(2, 0xffdd88, 0.5).strokeCircle(tank.x, tank.y, config.range!);
    if (!this.input.manager.isOver || this.fog?.contains(pointer) || pointer.y >= this.scale.height - GameScene.HUD_BAR_HEIGHT) return;
    const valid = mortarPointRejection(tank, point.worldX, point.worldY, config.range!) === null;
    const color = valid ? 0xffaa44 : 0xff3344;
    preview.fillStyle(color, 0.12).fillCircle(point.worldX, point.worldY, config.radius!);
    preview.lineStyle(2, color).strokeCircle(point.worldX, point.worldY, config.radius!);
  }

  /** Redraws each role ability's independent level, cooldown, and activation state. */
  private refreshAbilityHud() {
    if (!this.abilityHud || !this.myAbilityState) return;
    const { role, level, xp, skillPoints, abilities } = this.myAbilityState;
    const roleAbilityIds = ROLE_ABILITY_IDS[role as Role];
    if (!roleAbilityIds) return;
    if (this.abilityHud.slots.length !== roleAbilityIds.length) {
      const currentState = this.myAbilityState;
      this.destroyAbilityHud();
      this.myAbilityState = currentState;
      this.createAbilityHud();
    }
    this.abilityHud.slots.forEach((slot, index) => {
      const abilityId = roleAbilityIds[index];
      if (abilityId) slot.abilityId = abilityId;
    });
    const now = Date.now();
    this.abilityHud.levelText.setText(`LVL ${level}`);
    const requiredXp = getRequiredXpForNextLevel(level);
    const xpFraction = requiredXp > 0 ? Math.min(1, Math.max(0, xp / requiredXp)) : 0;
    const xpBarMaxWidth = 150;
    this.abilityHud.xpBarFill.setSize(xpBarMaxWidth * xpFraction, 14);
    this.abilityHud.xpText.setText(`${xp} / ${requiredXp} XP`);
    this.abilityHud.skillPointsText.setText(`Skill Points: ${skillPoints}`);

    this.abilityHud.slots.forEach((slot, index) => {
      const abilityId = slot.abilityId;
      const definition = getAbilityDefinition(abilityId);
      const ability = abilities.get(abilityId) ?? { level: 0, cooldownEndsAt: 0, cooldownMax: 0, activeUntil: 0 };
      const keyLabel = ABILITY_KEYS[index];
      slot.titleText.setText(`${definition.name.toUpperCase()} (${keyLabel})`);
      slot.slotBg.setStrokeStyle(2, this.resolveRoleVisual(role).color);
      this.drawAbilityIcon(slot.icon, abilityId, slot.slotBg.x, slot.slotBg.y, slot.slotSize * this.viewportScale());

      const abilityStatus = getAbilityHudStatus(ability, now);
      const remainingMs = abilityStatus.remainingMs;
      slot.cooldownOverlay.setSize(slot.slotSize, slot.slotSize * abilityStatus.cooldownFraction);
      const learned = ability.level > 0;
      slot.statusText.setText(
        abilityStatus.state === 'locked' ? 'LOCKED' :
          abilityStatus.state === 'active' ? 'ACTIVE' :
            abilityStatus.state === 'cooldown' ? `${Math.ceil(remainingMs / 1000)}s` : 'READY'
      );
      if (slot.abilityLearned !== learned) {
        if (learned) {
          slot.slotBg.setInteractive({ useHandCursor: true }).setAlpha(1);
          slot.icon.setAlpha(1);
        } else {
          slot.slotBg.disableInteractive().setAlpha(0.55);
          slot.icon.setAlpha(0.45);
        }
        slot.abilityLearned = learned;
      }
      if (ability.level <= 0) {
        slot.abilityLevelText.setText('Locked').setColor('#aaaaaa');
      } else if (ability.level >= MAX_ABILITY_LEVEL) {
        slot.abilityLevelText.setText(`Lv. ${ability.level} (MAX)`).setColor('#ffdd55');
      } else {
        slot.abilityLevelText.setText(`Lv. ${ability.level} / ${MAX_ABILITY_LEVEL}`).setColor('#ffffff');
      }
      const canUpgrade = skillPoints > 0 && ability.level < MAX_ABILITY_LEVEL;
      slot.upgradeButtonText.setText(ability.level >= MAX_ABILITY_LEVEL ? 'Maxed' : ability.level <= 0 ? 'Learn (1 SP)' : '+ Upgrade');
      if (canUpgrade) {
        slot.upgradeButtonBg.setFillStyle(0x227744, 1).setStrokeStyle(1, 0x44ee77);
        if (slot.upgradeButtonBg.input) slot.upgradeButtonBg.input.cursor = 'pointer';
        slot.upgradeButtonText.setColor('#ffffff');
      } else {
        slot.upgradeButtonBg.setFillStyle(0x22262a, 0.8).setStrokeStyle(1, 0x444d58);
        if (slot.upgradeButtonBg.input) slot.upgradeButtonBg.input.cursor = 'default';
        slot.upgradeButtonText.setColor('#778899');
      }
    });
  }
}
