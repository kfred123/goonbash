import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { GameState, LobbyInfo } from 'shared';

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private tankSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
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
  private static readonly NAME_STORAGE_KEY = 'goonbash_player_name';
  private static readonly MAX_NAME_LENGTH = 20;
  private static readonly CLICK_HIT_RADIUS_TANK = 24;
  private static readonly CLICK_HIT_RADIUS_MINION = 14;
  private static readonly CLICK_HIT_RADIUS_BASE = 30;
  private static readonly CLICK_MARKER_DURATION_MS = 1000;
  private readonly backendHttpUrl = (import.meta as any).env?.VITE_BACKEND_HTTP_URL || `${window.location.protocol}//${window.location.hostname}:2567`;
  private readonly backendWsUrl = (import.meta as any).env?.VITE_BACKEND_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:2567`;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {}

  create() {
    this.statusText = this.add.text(10, 10, 'Lobby menu', {
      color: '#aaaaff', fontSize: '14px',
      backgroundColor: '#00000088', padding: { x: 6, y: 4 }
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerClick(pointer));
    this.showMainMenu();
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
    this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2a2a4a, 1);
    for (let x = 0; x <= 800; x += 80) graphics.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 80) graphics.lineBetween(0, y, 800, y);
    this.add.text(400, 105, lobbyName, { color: '#ffffff', fontSize: '30px', fontStyle: 'bold' }).setOrigin(0.5);
  }

  private showWaitingLobby(state: GameState) {
    if (this.arenaStarted || !this.room) return;
    this.destroyMenuElements();
    this.addMenuText(400, 80, state.lobbyName, 32, '#ffffff', true);
    this.addMenuText(400, 125, 'Choose your team while the host prepares the match', 16, '#aaaaff');
    this.addMenuText(220, 185, 'RED TEAM', 18, '#ff7777', true);
    this.addMenuText(580, 185, 'BLUE TEAM', 18, '#7799ff', true);

    let redCount = 0;
    let blueCount = 0;
    state.tanks.forEach((tank, sessionId) => {
      const isRed = tank.team === 'red';
      const x = isRed ? 220 : 580;
      const index = isRed ? redCount++ : blueCount++;
      const isMe = sessionId === this.room.sessionId;
      const label = isMe ? `${tank.name} (You)` : tank.name;
      this.addMenuText(x, 225 + index * 28, label, 16, isRed ? '#ffaaaa' : '#aaccff');
    });

    this.addButton(220, 470, 150, 40, 'JOIN RED', () => this.room.send('change_team', 'red'));
    this.addButton(580, 470, 150, 40, 'JOIN BLUE', () => this.room.send('change_team', 'blue'));
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

    if (this.tankSprites.has(sessionId)) {
      this.tankTargets.set(sessionId, { x, y });
      const sprite = this.tankSprites.get(sessionId)!;
      sprite.setVisible(!isDead);
      this.tankNameTexts.get(sessionId)?.setVisible(!isDead);
    } else {
      // Spawn new
      const isMe = sessionId === this.room.sessionId;
      const teamColor = tank.team === 'blue' ? 0x4d8dff : 0xff4444;
      const sprite = this.add.rectangle(x, y, 40, 40, teamColor);
      if (isMe) sprite.setStrokeStyle(3, 0xffffff);
      const nameText = this.add.text(x, y - 26, isMe ? 'YOU' : (tank.name || 'Enemy'), {
        color: tank.team === 'blue' ? '#4d8dff' : '#ff4444',
        fontSize: '11px'
      }).setOrigin(0.5);
      sprite.setVisible(!isDead);
      nameText.setVisible(!isDead);
      this.tankSprites.set(sessionId, sprite);
      this.tankNameTexts.set(sessionId, nameText);
      console.log(`Spawned tank for ${sessionId} at ${x},${y}`);
    }

    this.updateHealthBar(sessionId, x, y - 32, tank.hp, tank.maxHp, !isDead);
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
      }
    });
    this.attackMarkers.forEach(({ graphics, targetId }) => {
      const position = this.findEntityPosition(targetId);
      if (position) graphics.setPosition(position.x, position.y);
    });
  }
}
