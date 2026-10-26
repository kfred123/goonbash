import { LobbyInfo, LOBBY_NAME_ERROR, normalizeLobbyName } from "shared";

export class LobbyRegistry {
  private readonly lobbies = new Map<string, LobbyInfo>();
  private readonly activeRooms = new Set<string>();

  claimRoom(id: string): void {
    if (!this.lobbies.has(id)) throw new Error("Lobby not found");
    if (this.activeRooms.has(id)) throw new Error("Lobby already has a room");
    this.activeRooms.add(id);
  }

  releaseRoom(id: string): void {
    this.activeRooms.delete(id);
    if (this.lobbies.get(id)?.players === 0) this.lobbies.delete(id);
  }

  create(name: string, maxPlayers = 10): LobbyInfo {
    const normalized = normalizeLobbyName(name);
    if (!normalized) throw new Error(LOBBY_NAME_ERROR);
    const id = crypto.randomUUID();
    const lobby: LobbyInfo = {
      id,
      name: normalized,
      players: 0,
      maxPlayers,
      status: "waiting"
    };
    this.lobbies.set(id, lobby);
    return { ...lobby };
  }

  list(): LobbyInfo[] {
    return [...this.lobbies.values()].filter(lobby => lobby.status !== "countdown").map((lobby) => ({ ...lobby }));
  }

  get(id: string): LobbyInfo | undefined {
    const lobby = this.lobbies.get(id);
    return lobby ? { ...lobby } : undefined;
  }

  join(id: string): LobbyInfo {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.status === "countdown") throw new Error("Game is counting down. Try again later.");
    if (lobby.players >= lobby.maxPlayers) throw new Error("Lobby is full");
    lobby.players += 1;
    lobby.status = lobby.players >= lobby.maxPlayers ? "full" : "waiting";
    return { ...lobby };
  }

  setCountdown(id: string, active: boolean): void {
    const lobby = this.lobbies.get(id);
    if (!lobby) throw new Error("Lobby not found");
    lobby.status = active ? "countdown" : lobby.players >= lobby.maxPlayers ? "full" : "waiting";
  }

  leave(id: string): void {
    const lobby = this.lobbies.get(id);
    if (!lobby) return;
    lobby.players = Math.max(0, lobby.players - 1);
    if (lobby.players === 0) {
      this.lobbies.delete(id);
      return;
    }
    if (lobby.status !== "countdown") lobby.status = "waiting";
  }
}
export const lobbyRegistry = new LobbyRegistry();