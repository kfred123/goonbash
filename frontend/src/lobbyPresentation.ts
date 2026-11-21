import { allPlayersReady } from "shared";
import type { GameState } from "shared";

export function getLobbyControls(state: GameState, sessionId: string) {
  const player = state.tanks.get(sessionId);
  const waiting = state.phase === "waiting";
  const isHost = state.hostSessionId === sessionId;
  return {
    isHost,
    canChoose: waiting && !!player && !player.ready,
    canReady: waiting && !!player,
    canStart: waiting && !!player && isHost && allPlayersReady(state.tanks.values())
  };
}

export function canManageBots(state: GameState, sessionId: string): boolean {
  const player = state.tanks.get(sessionId);
  return state.phase === "waiting" && state.hostSessionId === sessionId && player?.controllerType === "human";
}
