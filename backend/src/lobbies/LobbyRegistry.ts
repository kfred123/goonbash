import { LobbyInfo } from "shared";

export class LobbyRegistry {
  private readonly lobbies = new Map<string, LobbyInfo>();

  create(name = "New Game", maxPlayers = 10): LobbyInfo {
    const id = crypto.randomUUID();
    const lobby: LobbyInfo = {
      id,
      name: name.trim() || "New Game",
      players: 0,
      maxPlayers,
      status: "waiting"
    };
    this.lobbies.set(id, lobby);
    return { ...lobby };
  }

  list(): LobbyInfo[] {
    return [...this.lobbies.values()].map((lobby) => ({ ...lobby }));
  }

  get(id: string): LobbyInfo | undefined {
    const lobby = this.lobbies.get(id);
    return lobby ? { ...lobby } : undefined;
  }

  join(id: string): LobbyInfo {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.players >= lobby.maxPlayers) throw new Error("Lobby is full");
    lobby.players += 1;
    lobby.status = lobby.players >= lobby.maxPlayers ? "full" : "waiting";
    return { ...lobby };
  }

  leave(id: string): void {
    const lobby = this.lobbies.get(id);
    if (!lobby) return;
    lobby.players = Math.max(0, lobby.players - 1);
    if (lobby.players === 0) {
      this.lobbies.delete(id);
      return;
    }
    lobby.status = "waiting";
  }
}