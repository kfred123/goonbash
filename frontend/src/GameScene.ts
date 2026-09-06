import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { GameState, LobbyInfo } from 'shared';

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<GameState>;
  private tankSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private tankTargets: Map<string, { x: number; y: number }> = new Map();
  private minionSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private statusText!: Phaser.GameObjects.Text;
  private waitingText!: Phaser.GameObjects.Text;
  private currentLobbyId = '';
  private menuElements: Phaser.GameObjects.GameObject[] = [];
  private readonly backendHttpUrl = import.meta.env.VITE_BACKEND_HTTP_URL || `${window.location.protocol}//${window.location.hostname}:2567`;
  private readonly backendWsUrl = import.meta.env.VITE_BACKEND_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:2567`;

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
    this.showLobbyMenu();
  }

  private showLobbyMenu(message = '') {
    this.destroyMenuElements();
    this.addMenuText(400, 90, 'GOONBASH', 42, '#ffffff', true);
    this.addMenuText(400, 140, 'Choose a game or create your own', 18, '#aaaaff');
    this.addMenuText(245, 205, 'AVAILABLE GAMES', 16, '#00ff88', true);
    this.addButton(700, 205, 190, 44, 'CREATE GAME', () => void this.createLobby());
    this.addButton(520, 205, 100, 36, 'REFRESH', () => this.showLobbyMenu());
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
    this.room = await this.client.joinOrCreate<GameState>('game_room', { lobbyId: lobby.id });
    this.statusText.setText(`Connected | ${this.room.sessionId}`);
    this.statusText.setColor('#44ff88');
    this.destroyMenuElements();
    this.currentLobbyId = lobby.id;
    this.createArena(lobby);
    this.upsertTank({ x: 400, y: 300 }, this.room.sessionId);
    this.room.state.tanks.forEach((tank, sessionId) => this.upsertTank(tank, sessionId));
    const ownTank = this.room.state.tanks.get(this.room.sessionId);
    if (ownTank) this.upsertTank(ownTank, this.room.sessionId);
    this.room.state.tanks.onAdd((tank, sessionId) => {
      this.upsertTank(tank, sessionId);
      this.waitingText.setText(`Players: ${this.room.state.tanks.size}`);
    });
    this.room.state.minions.forEach((minion, id) => this.upsertMinion(minion, id));
    this.room.state.minions.onAdd((minion, id) => this.upsertMinion(minion, id));
    this.room.onStateChange((state: any) => {
      console.debug('[GameScene] State update:', {
        tankKeys: state.tanks ? Object.keys(state.tanks) : [],
        tankSprites: this.tankSprites.size
      });
      if (this.waitingText && state.tanks) {
        this.waitingText.setText(`Players: ${state.tanks.size ?? Object.keys(state.tanks).length}`);
      }
      if (state.tanks && typeof state.tanks.forEach === 'function') {
        state.tanks.forEach((tank: any, sessionId: string) => this.upsertTank(tank, sessionId));
      }
      if (state.minions && typeof state.minions.forEach === 'function') {
        state.minions.forEach((minion: any, id: string) => this.upsertMinion(minion, id));
      }
    });
    void this.refreshWaitingPlayers();
  }

  private createArena(lobby: LobbyInfo) {
    this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2a2a4a, 1);
    for (let x = 0; x <= 800; x += 80) graphics.lineBetween(x, 0, x, 600);
    for (let y = 0; y <= 600; y += 80) graphics.lineBetween(0, y, 800, y);
    this.add.text(400, 105, lobby.name, { color: '#ffffff', fontSize: '30px', fontStyle: 'bold' }).setOrigin(0.5);
    this.waitingText = this.add.text(400, 145, 'Waiting for players...', { color: '#aaaaff', fontSize: '18px' }).setOrigin(0.5);
    this.time.addEvent({ delay: 1000, loop: true, callback: () => void this.refreshWaitingPlayers() });
  }

  private async refreshWaitingPlayers() {
    try {
      const response = await fetch(`${this.lobbyApiUrl}/lobbies`);
      if (!response.ok || !this.waitingText) return;
      const data = await response.json() as { lobbies: LobbyInfo[] };
      const currentLobby = data.lobbies.find((entry) => entry.id === this.currentLobbyId);
      if (currentLobby) this.waitingText.setText(`Players: ${currentLobby.players}/${currentLobby.maxPlayers}`);
    } catch (error) {
      console.debug('[GameScene] Failed to refresh waiting players', error);
    }
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
  }

  private sendInput() {
    if (!this.room) return;
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
