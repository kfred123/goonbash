## Context

The Colyseus `GameRoom` currently creates tanks and begins the simulation as soon as a client joins. The Phaser client replaces the menu with the arena immediately, while `LobbyRegistry` exposes only the lobby name and aggregate player count. The new pre-game lobby needs authoritative, real-time participant and host state so every player sees the same teams, name, and start transition.

## Goals / Non-Goals

**Goals:**
- Keep team, host, display name, and match phase in the Colyseus room state delivered to all connected clients.
- Assign each joining player to the less populated red or blue team, with deterministic red selection when team counts are equal.
- Accept team-change, lobby-rename, and start-match messages only while the room is waiting, and authorize host-only actions on the server.
- Keep gameplay simulation inactive until the host starts the match, then transition every connected client into the existing arena and gameplay.
- Reflect an approved name change in the lobby registry so the server browser stays current.

**Non-Goals:**
- Implement team balancing after a player leaves, ready checks, team-size restrictions, or automatic countdowns.
- Add persistence, reconnect restoration, matchmaking, spectators, or new combat rules.
- Allow host transfer; the creator remains the host for the room lifetime.

## Decisions

### Model the waiting lobby in Colyseus room state

Add typed room-state fields for `waiting` or `started`, the lobby name, the host session ID, and a per-player roster containing the assigned team. Extend player/tank state or add a dedicated schema for roster data, depending on the existing schema conventions. Colyseus state synchronization makes roster and phase updates atomic from the clients' perspective and avoids polling HTTP for lobby details.

An HTTP-only lobby state was considered, but it cannot reliably coordinate the live room transition or enforce actions against the active client session.

### Authorize every state-changing message in `GameRoom`

The first client to join becomes host. The room registers explicit messages for team changes, renames, and start requests. It validates the requested team against `red` and `blue`; it ignores or rejects requests once the match started; and it performs rename/start only when the requesting session ID is the host ID.

Client-side control hiding is retained for usability but is not treated as authorization, since any client can send Colyseus messages directly.

### Start all players from one authoritative phase change

While phase is `waiting`, the simulation loop does not move tanks or spawn minions and the client renders the waiting lobby. A validated host start request changes phase to `started`; all clients observe that state change and build their arena/gameplay presentation. This supports late state synchronization without a separate start event race.

Sending a transient start message to each client was considered but rejected because clients joining or reconnecting around the event could miss it.

### Keep the server browser's name in `LobbyRegistry`

The host rename handler updates both the synchronized room name and the corresponding `LobbyRegistry` entry. The registry needs an explicit, validated rename operation rather than exposing mutable records, so `GET /lobbies` displays the name that players see in the room.

## Risks / Trade-offs

- [A host disconnects before starting] -> The lobby has no host transfer in this change; the waiting room remains joinable but cannot be started, and host reassignment can be added later.
- [Player counts briefly differ between HTTP and room state] -> Use room state for the waiting-lobby roster and treat the registry list as a server-browser summary.
- [Existing arena initialization assumes immediate joins] -> Gate simulation and move client arena setup behind the started phase, preserving the existing gameplay setup after transition.
- [A malformed client message requests an invalid team or name] -> Validate message payloads server-side and leave state unchanged on invalid input.
