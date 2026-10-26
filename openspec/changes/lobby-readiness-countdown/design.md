# Design

## Context

See `proposal.md` for motivation and the three delta specs for behavior. The application is a TypeScript workspace with a Phaser client, Express lobby endpoints, Colyseus rooms, and shared schema state. `GameScene` currently creates `New Game` directly, renders a minimally separated two-column roster, and offers host rename/start controls. `GameRoom` immediately initializes gameplay on `start_game`. `LobbyRegistry` accepts missing names and supports renaming.

`MatchPhase` currently contains waiting, started, and ended. Role/team guards only check phase. `VisibilitySerializer` sends roster metadata to everyone only in waiting; other phases use gameplay visibility. A countdown must not accidentally hide the opposing roster or reveal gameplay coordinates.

## Goals / Non-Goals

**Goals:**
- Keep readiness, countdown, membership, and match initialization authoritative in one room.
- Share authorization predicates between handlers and focused tests; derive UI availability from replicated state.
- Preserve complete pre-match metadata without broadening fog-of-war visibility.
- Reuse room-owned timing and existing Phaser rendering/input patterns without adding dependencies.

**Non-Goals:**
- New team balancing constraints, minimum team sizes, role quotas, bots, matchmaking, reconnect grace periods, or visual redesign outside lobby screens.
- Changing post-start join policy, combat initialization, progression, or result screens.
- Persisting lobbies across server restarts or supporting old clients after the coordinated protocol update.

## Decisions

### 1. Validate names once at the creation boundary and remove rename support

Reuse the existing trimmed 1-to-48-character lobby-name rule, moving its ownership to a shared lobby helper if both browser and backend need it. `POST /lobbies` must return HTTP 400 with the existing `{ error: string }` response shape on invalid input before creating a registry entry. `LobbyRegistry.create` must require and validate a name rather than silently substituting a default. Its accepted name flows into room state unchanged.

Replace direct creation with an in-menu name-entry form, confirmation, validation feedback, and cancel/back behavior. Follow the main menu's existing name-input pattern and clean up input elements when leaving the screen. Remove `renameLobby`, the host rename button, the registry rename method, and the `rename_lobby` mutation handler; a legacy message must never mutate state.

Alternative: keeping rename internally but hiding its button would not meet immutability and would leave an unnecessary mutation path.

### 2. Store readiness with the participant and extend the pre-match phase model

Add a replicated boolean `ready` to `Tank`, defaulting to false, and add `countdown` to `MatchPhase`. Add replicated `countdownSeconds` (0 outside countdown, 5 through 1 during it) and `countdownCancelReason` (empty or `player_left`) to `GameState`.

A `set_ready` message accepts only a boolean for the sender's existing tank while waiting. No client-supplied participant ID can authorize changes to someone else. Include the host in the all-ready predicate, require a nonempty roster, and derive the predicate from current participants rather than a cached count. Not-ready is reversible before countdown, as confirmed by the user. Setting ready does not require changing the existing default role.

Extend `canChangeTeam` and `canChangeRole` to require not-ready as well as waiting and valid input. Apply the guard in server handlers even if UI controls are disabled. Invalid lobby actions use a clear client-facing rejection message and server-side diagnostic following the existing message/error patterns; do not optimistically present rejected changes as accepted state.

Alternative: client-only flags or readiness kept outside replicated state would make authorization and multi-client presentation diverge.

### 3. Own the entire countdown lifecycle in GameRoom

On an authorized all-ready `start_game`, synchronously move waiting to countdown, clear the cancellation reason, and publish 5. Use the room clock's elapsed time for an internal deadline exactly 5000 ms later; a room-owned interval updates the replicated ceiling of remaining seconds. Do not decrement a counter blindly, since delayed callbacks must not extend the intended deadline.

At expiry, recheck phase, active countdown identity, nonempty membership, and readiness before executing the existing role-stat, tower, and tank initialization exactly once and entering started. Until then, `canUseGameplayActions` continues to allow only started, so simulation and input cannot affect the match. Repeated start requests cannot reset the deadline.

Centralize cancellation to clear timing resources and invalidate the active countdown identity before any stale callback can initialize gameplay. On any `onLeave` during countdown, cancel before finalizing membership/host updates, publish waiting with zero seconds and `player_left`, and retain remaining tanks' readiness. A new countdown always requires another explicit host start. Dispose also clears/invalidate countdown work, including empty-room cleanup.

The UI displays replicated seconds rather than running its own start timer or relying on browser wall-clock synchronization. This gives every client the same source of truth, subject to normal network delivery latency.

Alternative: client timers can desynchronize, cannot reliably arbitrate disconnects, and may start gameplay after cancellation.

### 4. Reject countdown joins without altering unrelated post-start policy

The user confirmed that new joins are blocked during countdown. Make the room admission predicate reject countdown before registry counts, tanks, or stats are mutated; retain existing behavior for started and ended rooms. Mirror countdown availability in `LobbyRegistry` so listings do not advertise a countdown room as joinable and cancellation restores waiting/full status from actual membership.

The current client uses `joinOrCreate` keyed by `lobbyId`. Do not rely solely on Colyseus room locking: a locked room can cause that call to create a second room for the same lobby. Preserve unique room ownership for each lobby and enforce countdown rejection in admission even for stale list entries or queued reservations. If room locking is used, change the join path to resolve and join the existing room without a create fallback. Verify rejected joins leave counts unchanged and do not create a duplicate room.

Alternative: allowing a join and then cancelling was explicitly declined by the user.

### 5. Treat waiting and countdown as metadata-only lobby views

Update `VisibilitySerializer` so both phases share the roster projection, copying readiness and countdown/cancellation metadata to all participants. Never expose canonical tank positions, structures, projectiles, or gameplay-only state merely because a countdown began. On cancellation and the later started transition, ensure existing view-reset behavior handles both pre-match phases correctly.

Keep the client in its pre-match renderer for waiting and countdown; only a replicated started phase creates the arena. This avoids the current waiting-only branch falling through into gameplay assumptions.

Alternative: adding countdown only to `MatchPhase` without changing projection and client routing would apply gameplay visibility to the pre-match roster.

### 6. Refine the existing lobby layout, not the whole menu system

Render two bounded team panels with distinct red/blue accents, headings, counts, empty states, and consistently aligned name/role/status rows. Draw a green checkmark with Phaser graphics plus a textual ready label, avoiding dependence on a font's Unicode glyph support or color alone. Allow the existing ten-player capacity even when everyone selects the same team through roster scrolling or a bounded layout; long valid names must not overlap status or controls.

Place local team, role, readiness, and host start controls outside the roster bounds. Ready players can select `Nicht bereit` while waiting, but their team and role controls are visibly and interactively disabled. Show the host's disabled start control with the waiting-readiness reason. During countdown, render a prominent shared number and lock configuration/readiness/start interaction; keep leave available. On cancellation show the reason and current host, and require a fresh click to start again.

Refresh roster/control state on authoritative patches, but avoid destroying input focus or rebuilding the entire menu on every frame. Release countdown presentation resources and event handlers when leaving, starting, or shutting down the scene.

Alternative: retaining unbounded text columns does not provide clearly separated lists and fails for unbalanced ten-player rosters.

## Risks / Trade-offs

- [Late timer callback after cancellation or a second countdown] -> Clear resources and check countdown identity/phase before initialization; test old deadlines explicitly.
- [Disconnect racing expiry] -> Serialize transitions in the room event loop; any leave processed while still counting down cancels, while a leave after started uses existing gameplay semantics.
- [Countdown join rejection accidentally creates another room] -> Test the actual matchmaking/admission path, not only a pure predicate; do not use lock plus unchecked `joinOrCreate`.
- [Fog-of-war projection hides readiness or leaks coordinates] -> Add wire-level replication coverage for waiting, countdown, cancellation, and started transitions.
- [Schema or message mismatch with cached clients] -> Deploy shared/backend/frontend together; existing sessions may require reconnecting.
- [Network latency delays an individual countdown display] -> Replicate server-derived seconds and start phase; clients never independently decide match start.
- [Maximum-capacity team panels overflow] -> Verify ten players on one team, long names, empty teams, and resized viewports.

## Migration Plan

1. Add schema fields, phase types, and tested validation/authorization helpers, then wire backend lifecycle and replication before client behavior.
2. Update client creation, panels, countdown routing, and related documentation; remove obsolete rename/immediate-start expectations from tests.
3. Deploy all workspaces together. There is no persisted lobby migration; existing in-memory rooms can be recreated with names and not-ready participants.
4. Roll back the complete coordinated release rather than mixing schema/protocol versions. Recreate affected in-memory rooms after rollback.
