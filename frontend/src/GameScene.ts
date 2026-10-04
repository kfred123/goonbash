import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { GameState, LobbyInfo, ROLE_ABILITY_CONFIG, ROLE_VISUALS, Role, RoleVisual } from 'shared';

const ROLE_ORDER: Role[] = ['healer', 'tank', 'damagedealer'];

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private tankSprites: Map<string, Phaser.GameObjects.Shape> = new Map();
  private tankTargets: Map<string, { x: number; y: number }> = new Map();
  private tankNameTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private minionSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private baseSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private healthBars: Map<string, { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; width: number }> = new Map();
  private attackMarkers: Array<{ graphics: Phaser.GameObjects.Graphics; targetId: string }> = [];
  private statusText!: Phaser.GameObjects.Text;
  private menuElements: Phaser.GameObjects.GameObject[] = [];
  private nameInputEl: HTMLInputElement | null = null;
  private playerName = '';
  private leavingRoom = false;
  private arenaStarted = false;
  private abilityHud?: {
    bar: Phaser.GameObjects.Rectangle;
    barBorder: Phaser.GameObjects.Rectangle;
    slotBg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Graphics;
    cooldownOverlay: Phaser.GameObjects.Rectangle;
    titleText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    slotSize: number;
    slotTop: number;
    role: string;
  };
  private myAbilityState: { role: string; cooldownEndsAt: number; cooldownMax: number; activeUntil: number } | null = null;
  private healEffectIcons: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private static readonly NAME_STORAGE_KEY = 'goonbash_player_name';
  private static readonly MAX_NAME_LENGTH = 20;
  private static readonly CLICK_HIT_RADIUS_TANK = 24;
  private static readonly CLICK_HIT_RADIUS_MINION = 14;
  private static readonly CLICK_HIT_RADIUS_BASE = 30;
  private static readonly CLICK_MARKER_DURATION_MS = 1000;
  private static readonly HUD_BAR_HEIGHT = 92;
  // World is 3x the 800x600 viewport (matching backend GameRoom's WORLD_WIDTH/WORLD_HEIGHT)
  // so the camera only ever shows a portion of the map at once.
  private static readonly WORLD_WIDTH = 2400;
  private static readonly WORLD_HEIGHT = 1800;
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
    this.cameras.main.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    this.statusText = this.add.text(10, 10, 'Lobby menu', {
      color: '#aaaaff', fontSize: '14px',
      backgroundColor: '#00000088', padding: { x: 6, y: 4 }
    }).setScrollFactor(0);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerClick(pointer));
    this.input.keyboard?.on('keydown-SPACE', () => this.activateAbility());
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
      left: '300px',
      top: '244px',
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
    const finish = () => {
      this.leavingRoom = false;
      this.arenaStarted = false;
      this.destroyAbilityHud();
      this.room = undefined as unknown as Room<GameState>;
      this.showMainMenu();
    };
    if (room) {
      room.leave().catch(() => {}).finally(finish);
    } else {
      finish();
    }
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
    this.client = new Client(this.backendWsUrl);
    this.room = await this.client.joinOrCreate<GameState>('game_room', { lobbyId: lobby.id, playerName: this.playerName });
    this.statusText.setText(`Connected | ${this.room.sessionId}`);
    this.statusText.setColor('#44ff88');
    this.destroyMenuElements();
    this.room.state.tanks.onAdd((tank, sessionId) => {
      if (this.arenaStarted) this.upsertTank(tank, sessionId);
    });
    this.room.state.minions.forEach((minion, id) => this.upsertMinion(minion, id));
    this.room.state.minions.onAdd((minion, id) => {
      if (this.arenaStarted) this.upsertMinion(minion, id);
    });
    this.room.state.minions.onRemove((_minion, id) => this.removeMinion(id));
    this.room.state.projectiles.forEach((projectile, id) => this.upsertProjectile(projectile, id));
    this.room.state.projectiles.onAdd((projectile, id) => this.upsertProjectile(projectile, id));
    this.room.state.projectiles.onRemove((_projectile, id) => this.removeProjectile(id));
    this.room.onStateChange((state: any) => {
      if (state.phase === 'waiting') {
        this.showWaitingLobby(state);
        return;
      }
      if (state.phase === 'started' && !this.arenaStarted) {
        this.arenaStarted = true;
        this.createArena(state.lobbyName);
        state.tanks?.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
        state.bases?.forEach((base: any, id: string) => this.upsertBase(base, id));
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
    });
    this.showWaitingLobby(this.room.state);
  }

  private createArena(lobbyName: string) {
    this.destroyMenuElements();
    this.destroyAbilityHud();
    this.createTilemap();
    this.add.text(400, 20, lobbyName, { color: '#ffffff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(1500);
    this.createAbilityHud();
  }

  /** Creates the tilemap-based arena background from the preloaded Tiled JSON and texture assets. */
  private createTilemap() {
    const map = this.make.tilemap({ key: 'arena-map' });
    const grassTileset = map.addTilesetImage('grass', 'grass');
    const cobbleTileset = map.addTilesetImage('cobblestone', 'cobblestone');
    if (grassTileset && cobbleTileset) {
      const layer = map.createLayer('ground', [grassTileset, cobbleTileset]);
      layer?.setDepth(-1);
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
      this.addRoleCard(x, 460, role, myTank?.role === role, teamColor, () => this.room.send('select_role', role));
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
    const element = this.add.text(x, y, text, {
      color, fontSize: `${fontSize}px`, fontStyle: bold ? 'bold' : 'normal'
    }).setOrigin(0.5);
    this.menuElements.push(element);
    return element;
  }

  private addButton(x: number, y: number, width: number, height: number, label: string, action: () => void) {
    const button = this.add.rectangle(x, y, width, height, 0x245c52).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { color: '#ffffff', fontSize: '15px', fontStyle: 'bold' }).setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(0x347d6c));
    button.on('pointerout', () => button.setFillStyle(0x245c52));
    button.on('pointerdown', action);
    this.menuElements.push(button, text);
    return button;
  }

  /** Renders a selectable role card (shape preview + label) for the lobby role picker; colored with the player's team color, never a per-role color. */
  private addRoleCard(x: number, y: number, role: Role, selected: boolean, teamColor: number, action: () => void) {
    const visual = ROLE_VISUALS[role];
    const width = 130;
    const height = 60;
    const card = this.add.rectangle(x, y, width, height, teamColor, selected ? 0.85 : 0.25).setInteractive({ useHandCursor: true });
    card.setStrokeStyle(selected ? 4 : 2, teamColor, selected ? 1 : 0.6);
    const icon = this.createRoleShape(x, y - 8, visual.shape, 20, teamColor);
    icon.setAlpha(selected ? 1 : 0.85);
    const text = this.add.text(x, y + 18, visual.label, { color: '#ffffff', fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5);
    card.on('pointerover', () => card.setFillStyle(teamColor, selected ? 0.85 : 0.45));
    card.on('pointerout', () => card.setFillStyle(teamColor, selected ? 0.85 : 0.25));
    card.on('pointerdown', action);
    this.menuElements.push(card, icon, text);
    return card;
  }

  /** Looks up the color/shape visual for a role, falling back to the Tank visual for an unset/unknown role. */
  private resolveRoleVisual(role: unknown): RoleVisual {
    return ROLE_VISUALS[(role as Role)] ?? ROLE_VISUALS.tank;
  }

  /** Creates the Phaser shape used to represent a role (circle/square/triangle), centered at the given position. */
  private createRoleShape(x: number, y: number, shape: RoleVisual['shape'], size: number, color: number): Phaser.GameObjects.Shape {
    if (shape === 'circle') return this.add.circle(x, y, size / 2, color);
    if (shape === 'triangle') {
      const half = size / 2;
      return this.add.triangle(x, y, 0, -half, -half, half, half, half, color);
    }
    return this.add.rectangle(x, y, size, size, color);
  }

  private destroyMenuElements() {
    this.menuElements.forEach((element) => element.destroy());
    this.menuElements = [];
    this.removeNameInput();
  }

  private upsertTank(tank: any, sessionId: string) {
    if (!tank) return;

    const x = tank.x ?? 200;
    const y = tank.y ?? 200;
    const isDead = tank.state === 'dead';
    const roleVisual = this.resolveRoleVisual(tank.role);
    const teamColor = tank.team === 'blue' ? 0x4d8dff : 0xff4444;

    if (this.tankSprites.has(sessionId)) {
      this.tankTargets.set(sessionId, { x, y });
      const sprite = this.tankSprites.get(sessionId)!;
      sprite.setVisible(!isDead);
      this.tankNameTexts.get(sessionId)?.setVisible(!isDead);
    } else {
      // Spawn new
      const isMe = sessionId === this.room.sessionId;
      const sprite = this.createRoleShape(x, y, roleVisual.shape, 40, teamColor);
      sprite.setStrokeStyle(isMe ? 4 : 2, isMe ? 0xffffff : teamColor);
      const displayName = tank.name || 'Player';
      const nameText = this.add.text(x, y - 26, isMe ? `${displayName} (You)` : displayName, {
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

    this.updateHealthBar(sessionId, x, y - 32, tank.hp, tank.maxHp, !isDead);

    if (sessionId === this.room.sessionId) {
      this.myAbilityState = {
        role: tank.role,
        cooldownEndsAt: tank.abilityCooldownEndsAt ?? 0,
        cooldownMax: tank.abilityCooldownMax ?? 0,
        activeUntil: tank.abilityActiveUntil ?? 0
      };
    }
  }

  private upsertMinion(minion: any, id: string) {
    if (!minion) return;
    const x = minion.x ?? 0;
    const y = minion.y ?? 0;
    const sprite = this.minionSprites.get(id) ?? this.add.rectangle(
      x,
      y,
      18,
      18,
      minion.team === 'blue' ? 0x4d8dff : 0xff884d
    );
    sprite.x = x;
    sprite.y = y;
    this.minionSprites.set(id, sprite);
    this.updateHealthBar(id, x, y - 16, minion.hp, minion.maxHp, true);
  }

  private upsertBase(base: any, id: string) {
    if (!base) return;
    const x = base.x ?? 0;
    const y = base.y ?? 0;
    const sprite = this.baseSprites.get(id) ?? this.add.rectangle(
      x,
      y,
      50,
      50,
      base.team === 'blue' ? 0x2255aa : 0xaa3322
    ).setStrokeStyle(3, 0xffffff);
    sprite.x = x;
    sprite.y = y;
    this.baseSprites.set(id, sprite);
    this.updateHealthBar(id, x, y - 40, base.hp, base.maxHp, true);
  }

  private removeMinion(id: string) {
    this.minionSprites.get(id)?.destroy();
    this.minionSprites.delete(id);
    this.removeHealthBar(id);
  }

  private upsertProjectile(projectile: any, id: string) {
    if (!projectile) return;
    const x = projectile.x ?? 0;
    const y = projectile.y ?? 0;
    const sprite = this.projectileSprites.get(id) ?? this.add.circle(
      x,
      y,
      4,
      projectile.team === 'blue' ? 0x99ccff : 0xffcc99
    );
    sprite.x = x;
    sprite.y = y;
    this.projectileSprites.set(id, sprite);
  }

  private removeProjectile(id: string) {
    this.projectileSprites.get(id)?.destroy();
    this.projectileSprites.delete(id);
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
    return closest;
  }

  /** Looks up the current live position of a tank, minion, or base by id (used to keep an attack marker centered on a moving target). */
  private findEntityPosition(id: string): { x: number; y: number } | null {
    const tank = this.room.state.tanks.get(id) as any;
    if (tank) return { x: tank.x, y: tank.y };
    const minion = this.room.state.minions.get(id) as any;
    if (minion) return { x: minion.x, y: minion.y };
    const base = this.room.state.bases.get(id) as any;
    if (base) return { x: base.x, y: base.y };
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
    const marker = this.createCrossGraphics(color).setPosition(x, y);
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
    if (pointer.button !== 0 || !this.arenaStarted || !this.room || this.room.state.phase !== 'started') return;
    if (pointer.y >= 600 - GameScene.HUD_BAR_HEIGHT) return; // clicks on the HUD bar are not movement/attack commands
    const myTank = this.room.state.tanks.get(this.room.sessionId) as any;
    if (!myTank || myTank.state === 'dead') return;
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const hit = this.hitTestClick(worldX, worldY);
    if (hit) {
      if (hit.team === myTank.team) return; // friendly unit: no command, no marker
      this.room.send('command', { targetId: hit.id });
      this.showAttackMarker(hit.id, hit.x, hit.y, 0xff3333);
      return;
    }
    this.room.send('command', { x: worldX, y: worldY });
    this.showClickMarker(worldX, worldY, 0x33ff55);
  }

  update() {
    this.tankTargets.forEach((target, sessionId) => {
      const sprite = this.tankSprites.get(sessionId);
      if (sprite) {
        sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.25);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.25);
        this.tankNameTexts.get(sessionId)?.setPosition(sprite.x, sprite.y - 26);
        this.updateHealthBarPosition(sessionId, sprite.x, sprite.y - 32);
      }
    });
    this.attackMarkers.forEach(({ graphics, targetId }) => {
      const position = this.findEntityPosition(targetId);
      if (position) graphics.setPosition(position.x, position.y);
    });
    this.refreshAbilityHud();
    this.applyRoleAbilityVisuals();
  }

  /**
   * Renders the visible side-effects of an active role ability on the units themselves:
   * the tank's hull turns thick and black while its shield is up, and a bobbing wrench icon
   * hovers over every unit currently receiving the healer's heal-aura.
   */
  private applyRoleAbilityVisuals() {
    if (!this.arenaStarted || !this.room) return;
    const now = Date.now();
    const healRadius = ROLE_ABILITY_CONFIG.healer.radius ?? 0;
    const healedSessionIds = new Set<string>();

    this.room.state.tanks.forEach((healerTank: any, healerId: string) => {
      if (healerTank.role !== 'healer' || healerTank.state === 'dead') return;
      if (now >= (healerTank.abilityActiveUntil ?? 0)) return;
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
      const shieldActive = tank.role === 'tank' && now < (tank.abilityActiveUntil ?? 0);
      if (shieldActive) {
        sprite.setStrokeStyle(7, 0x000000);
      } else {
        const isMe = sessionId === this.room.sessionId;
        const teamColor = tank.team === 'blue' ? 0x4d8dff : 0xff4444;
        sprite.setStrokeStyle(isMe ? 4 : 2, isMe ? 0xffffff : teamColor);
      }
    });

    healedSessionIds.forEach((sessionId) => {
      if (this.healEffectIcons.has(sessionId)) return;
      const icon = this.add.graphics().setDepth(500);
      this.drawWrenchIcon(icon, 0, 0, 22);
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
      const bob = Math.sin((t + sessionId.length * 137) / 260) * 5;
      icon.setPosition(sprite.x, sprite.y - 40 + bob);
    });
  }

  /** Creates a full-width bottom HUD bar, clearly separated from the arena, with a role-iconic ability button. */
  private createAbilityHud() {
    const gameWidth = 800;
    const gameHeight = 600;
    const barHeight = GameScene.HUD_BAR_HEIGHT;
    const barTop = gameHeight - barHeight;
    const barCenterY = barTop + barHeight / 2;
    const slotSize = 60;
    const slotTop = barCenterY - slotSize / 2;

    const bar = this.add.rectangle(gameWidth / 2, barCenterY, gameWidth, barHeight, 0x0b0d10, 0.95).setDepth(2000).setScrollFactor(0);
    const barBorder = this.add.rectangle(gameWidth / 2, barTop, gameWidth, 3, 0x3a4a63, 1).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0);
    const slotBg = this.add.rectangle(gameWidth / 2, barCenterY, slotSize, slotSize, 0x1c2430, 0.9)
      .setStrokeStyle(3, 0xffffff)
      .setDepth(2001)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const icon = this.add.graphics().setDepth(2002).setScrollFactor(0);
    const cooldownOverlay = this.add.rectangle(gameWidth / 2, slotTop, slotSize, 0, 0x000000, 0.65).setOrigin(0.5, 0).setDepth(2002).setScrollFactor(0);
    const titleText = this.add.text(gameWidth / 2, barTop + 14, '', { color: '#ffffff', fontSize: '12px', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(2001).setScrollFactor(0);
    const statusText = this.add.text(gameWidth / 2, gameHeight - 14, '', { color: '#cfe8ff', fontSize: '12px' }).setOrigin(0.5, 1).setDepth(2001).setScrollFactor(0);
    slotBg.on('pointerdown', () => this.activateAbility());
    this.abilityHud = { bar, barBorder, slotBg, icon, cooldownOverlay, titleText, statusText, slotSize, slotTop, role: '' };
  }

  private destroyAbilityHud() {
    this.healEffectIcons.forEach((icon) => icon.destroy());
    this.healEffectIcons.clear();
    if (!this.abilityHud) return;
    this.abilityHud.bar.destroy();
    this.abilityHud.barBorder.destroy();
    this.abilityHud.slotBg.destroy();
    this.abilityHud.icon.destroy();
    this.abilityHud.cooldownOverlay.destroy();
    this.abilityHud.titleText.destroy();
    this.abilityHud.statusText.destroy();
    this.abilityHud = undefined;
    this.myAbilityState = null;
  }

  /** Draws a stylized wrench glyph (healer) centered at cx/cy within the given icon size. */
  private drawWrenchIcon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    const half = size / 2;
    g.lineStyle(4, 0xffffff, 1);
    g.beginPath();
    g.moveTo(cx - half * 0.5, cy + half * 0.6);
    g.lineTo(cx + half * 0.3, cy - half * 0.3);
    g.strokePath();
    g.beginPath();
    g.arc(cx + half * 0.45, cy - half * 0.45, half * 0.35, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(300), false);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - half * 0.55, cy + half * 0.55, half * 0.18);
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

  /** Dispatches to the role-specific icon glyph so each ability button is recognizable at a glance. */
  private drawRoleIcon(g: Phaser.GameObjects.Graphics, role: string, cx: number, cy: number, size: number) {
    g.clear();
    if (role === 'healer') this.drawWrenchIcon(g, cx, cy, size);
    else if (role === 'tank') this.drawShieldIcon(g, cx, cy, size);
    else if (role === 'damagedealer') this.drawRapidFireIcon(g, cx, cy, size);
  }

  /** Sends the ability-activation request for the local player's role, unless it is clearly still on cooldown. */
  private activateAbility() {
    if (!this.arenaStarted || !this.room || this.room.state.phase !== 'started') return;
    const myTank = this.room.state.tanks.get(this.room.sessionId) as any;
    if (!myTank || myTank.state === 'dead') return;
    if (Date.now() < (myTank.abilityCooldownEndsAt ?? 0)) return;
    this.room.send('activate_ability');
  }

  /** Redraws the ability HUD's icon, cooldown overlay, and status text every frame from the last-synced ability state. */
  private refreshAbilityHud() {
    if (!this.abilityHud || !this.myAbilityState) return;
    const { role, cooldownEndsAt, cooldownMax, activeUntil } = this.myAbilityState;
    const visual = this.resolveRoleVisual(role);
    const gameWidth = 800;
    const slotCenterY = this.abilityHud.slotTop + this.abilityHud.slotSize / 2;
    if (this.abilityHud.role !== role) {
      this.abilityHud.slotBg.setStrokeStyle(3, visual.color);
      this.drawRoleIcon(this.abilityHud.icon, role, gameWidth / 2, slotCenterY, this.abilityHud.slotSize);
      this.abilityHud.titleText.setText(`${visual.abilityLabel.toUpperCase()} (SPACE)`);
      this.abilityHud.role = role;
    }
    const now = Date.now();
    const remainingMs = Math.max(0, cooldownEndsAt - now);
    const fraction = cooldownMax > 0 ? Math.min(1, remainingMs / cooldownMax) : 0;
    this.abilityHud.cooldownOverlay.setSize(this.abilityHud.slotSize, this.abilityHud.slotSize * fraction);
    const active = now < activeUntil;
    this.abilityHud.statusText.setText(active ? 'ACTIVE' : fraction > 0 ? `${Math.ceil(remainingMs / 1000)}s` : 'READY');
  }
}
