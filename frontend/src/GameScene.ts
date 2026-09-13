import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { GameState, LobbyInfo } from 'shared';

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private tankSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private tankTargets: Map<string, { x: number; y: number }> = new Map();
  private minionSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private minionHealthBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private towerSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private towerHealthBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private statusText!: Phaser.GameObjects.Text;
  private menuElements: Phaser.GameObjects.GameObject[] = [];
  private nameInputEl: HTMLInputElement | null = null;
  private playerName = '';
  private leavingRoom = false;
  private arenaStarted = false;
  private static readonly NAME_STORAGE_KEY = 'goonbash_player_name';
  private static readonly MAX_NAME_LENGTH = 20;
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
    this.input.keyboard?.on('keydown', () => this.sendInput());
    this.input.keyboard?.on('keyup', () => this.sendInput());
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
    this.room.state.towers.forEach((tower, id) => this.upsertTower(tower, id));
    this.room.state.towers.onAdd((tower, id) => {
      if (this.arenaStarted) this.upsertTower(tower, id);
    });
    this.room.onStateChange((state: any) => {
      if (state.phase === 'waiting') {
        this.showWaitingLobby(state);
        return;
      }
      if (state.phase === 'started' && !this.arenaStarted) {
        this.arenaStarted = true;
        this.createArena(state.lobbyName);
        state.tanks?.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
        state.towers?.forEach((tower: any, id: string) => this.upsertTower(tower, id));
      }
      if (this.arenaStarted && state.tanks && typeof state.tanks.forEach === 'function') {
        state.tanks.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
      }
      if (this.arenaStarted && state.minions && typeof state.minions.forEach === 'function') {
        state.minions.forEach((minion: any, id: string) => this.upsertMinion(minion, id));
      }
      if (this.arenaStarted && state.towers && typeof state.towers.forEach === 'function') {
        state.towers.forEach((tower: any, id: string) => this.upsertTower(tower, id));
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

    if (this.tankSprites.has(sessionId)) {
    this.tankTargets.set(sessionId, { x, y });
      // Update existing
      const sprite = this.tankSprites.get(sessionId)!;
    } else {
      // Spawn new
      const isMe = sessionId === this.room.sessionId;
      const color = isMe ? 0x00ff88 : 0xff4444;
      const sprite = this.add.rectangle(x, y, 40, 40, color);
      this.add.text(x, y - 26, isMe ? 'YOU' : 'Enemy', {
        color: isMe ? '#00ff88' : '#ff4444',
        fontSize: '11px'
      }).setOrigin(0.5);
      this.tankSprites.set(sessionId, sprite);
      console.log(`Spawned tank for ${sessionId} at ${x},${y}`);
    }
  }

  private upsertMinion(minion: any, id: string) {
    if (!minion) return;
    const sprite = this.minionSprites.get(id) ?? this.add.rectangle(
      minion.x ?? 0,
      minion.y ?? 0,
      18,
      18,
      minion.team === 'blue' ? 0x4d8dff : 0xff884d
    );
    sprite.x = minion.x ?? sprite.x;
    sprite.y = minion.y ?? sprite.y;
    this.minionSprites.set(id, sprite);

    const healthBar = this.minionHealthBars.get(id) ?? this.add.graphics();
    this.minionHealthBars.set(id, healthBar);
    this.drawHealthBar(healthBar, sprite.x, sprite.y - 16, 20, 3, minion.hp, minion.maxHp);
  }

  private removeMinion(id: string) {
    this.minionSprites.get(id)?.destroy();
    this.minionSprites.delete(id);
    this.minionHealthBars.get(id)?.destroy();
    this.minionHealthBars.delete(id);
  }

  private upsertTower(tower: any, id: string) {
    if (!tower) return;
    const sprite = this.towerSprites.get(id) ?? this.add.rectangle(
      tower.x ?? 0,
      tower.y ?? 0,
      48,
      48,
      tower.team === 'blue' ? 0x2255cc : 0xcc4422
    );
    sprite.x = tower.x ?? sprite.x;
    sprite.y = tower.y ?? sprite.y;
    this.towerSprites.set(id, sprite);

    const healthBar = this.towerHealthBars.get(id) ?? this.add.graphics();
    this.towerHealthBars.set(id, healthBar);
    this.drawHealthBar(healthBar, sprite.x, sprite.y - 36, 50, 5, tower.hp, tower.maxHp);
  }

  private drawHealthBar(graphics: Phaser.GameObjects.Graphics, centerX: number, y: number, width: number, height: number, hp: number, maxHp: number) {
    const ratio = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    const left = centerX - width / 2;
    graphics.clear();
    graphics.fillStyle(0x222222, 0.9);
    graphics.fillRect(left, y, width, height);
    graphics.fillStyle(ratio > 0.3 ? 0x44dd66 : 0xdd4444, 1);
    graphics.fillRect(left, y, width * ratio, height);
  }

  private sendInput() {
    if (!this.room || this.room.state.phase !== 'started') return;
    const keys = this.input.keyboard?.createCursorKeys();
    if (!keys) return;
    const inputX = (keys.right.isDown ? 1 : 0) - (keys.left.isDown ? 1 : 0);
    const inputY = (keys.down.isDown ? 1 : 0) - (keys.up.isDown ? 1 : 0);
    const wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    const x = inputX || ((wasd?.D.isDown ? 1 : 0) - (wasd?.A.isDown ? 1 : 0));
    const y = inputY || ((wasd?.S.isDown ? 1 : 0) - (wasd?.W.isDown ? 1 : 0));
    this.room.send('input', { x, y });
  }

  update() {
    this.tankTargets.forEach((target, sessionId) => {
      const sprite = this.tankSprites.get(sessionId);
      if (sprite) {
        sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.25);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.25);
      }
    });
    this.sendInput();
  }
}
