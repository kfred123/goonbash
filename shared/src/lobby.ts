export type LobbyStatus = "waiting" | "full";
export type LobbyTeam = "red" | "blue";
export type MatchPhase = "waiting" | "started";

export interface LobbyInfo {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: LobbyStatus;
}

export interface LobbyListResponse {
  lobbies: LobbyInfo[];
}

export interface CreateLobbyResponse {
  lobby: LobbyInfo;
}

export interface LobbyErrorResponse {
  error: string;
}