# Tasks

## 1. Named creation and immutable lobby identity

- [x] 1.1 Reuse or relocate the trimmed 1-to-48-character lobby-name validator and make `LobbyRegistry.create` require a valid name with no fallback; verify unit tests cover missing/non-string, blank, whitespace-trimmed, 48-character, and 49-character input without creating entries on failure.
- [x] 1.2 Validate `POST /lobbies` before registry mutation and return HTTP 400 with `{ error: string }` for invalid names; verify endpoint tests cover accepted trimmed names and rejected requests with unchanged registry contents.
- [x] 1.3 Remove registry renaming, the room rename mutation handler, client rename method, and rename button; update affected tests and verify a legacy `rename_lobby` message never changes the room or listed name.
- [x] 1.4 Replace direct `New Game` creation with an in-menu name-entry/confirm/cancel flow using existing input patterns; verify validation feedback, cancellation without a request, correct payload, server-error presentation, and input cleanup.
- [x] 1.5 Update directly related creation/API documentation in the existing documentation files; verify examples supply a valid name and no longer instruct hosts to rename a lobby.

## 2. Shared readiness and server authorization

- [x] 2.1 Add the countdown match phase, replicated default-false participant readiness, and replicated countdown-seconds/cancellation fields; verify schema round-trip/default tests and the shared workspace build.
- [x] 2.2 Implement the sender-only boolean `set_ready` handler while waiting; verify handler-level tests cover ready/not-ready transitions, default readiness for newcomers, malformed/cross-player payloads, missing participants, and rejection outside waiting.
- [x] 2.3 Extend team and role guards to require a not-ready player in waiting and wire both handlers to them; verify existing valid choices/default roles still work, ready players cannot switch, returning to not ready restores access, and countdown/started/ended requests do not mutate state.
- [x] 2.4 Add a nonempty all-current-participants-ready start predicate including the host and provide explicit lobby-action rejection feedback; verify non-host requests and a not-ready host or peer cannot begin a countdown, and rejections are observable without optimistic state changes.
- [x] 2.5 Document readiness semantics and message changes alongside the existing lobby usage/protocol documentation; verify the documentation states that readiness is reversible only before countdown and locks both team and role.

## 3. Authoritative countdown, cancellation, and room admission

- [x] 3.1 Replace immediate start with a room-clock-owned 5000 ms deadline and server-derived 5-to-1 countdown; preserve existing gameplay initialization behind completion checks, and verify controlled-clock tests at 0, 999, 1000, 4999, and 5000 ms show no early gameplay and exactly one start.
- [x] 3.2 Reject duplicate start and all configuration/readiness/gameplay mutations during countdown; verify repeated requests do not reset the deadline, change player state, spawn units, or initialize gameplay twice.
- [x] 3.3 Centralize countdown cancellation/invalidation and wire participant leave, disconnect, empty-room cleanup, and disposal; verify host/non-host departures restore waiting with `player_left`, preserve remaining readiness, transfer host when needed, and prevent old callbacks from starting a cancelled or disposed room.
- [x] 3.4 Require explicit host start after cancellation and support a fresh five-second countdown; verify the former deadline cannot trigger the replacement countdown early and no automatic restart occurs when everyone remaining is ready.
- [x] 3.5 Block countdown admission before player/count mutations, reflect unavailable countdown rooms in listings, and restore waiting/full availability on cancellation; verify stale-list joins fail without changing membership, readiness, or countdown while existing post-start/ended behavior is preserved.
- [x] 3.6 Exercise the actual `joinOrCreate`/room-admission path and enforce one room per lobby during countdown rejection; verify no second room is created and no failed reservation's cleanup corrupts player counts or cancels a valid countdown.
- [x] 3.7 Update existing lobby lifecycle documentation for five-second timing, locked countdown, blocked joins, cancellation, host succession, and coordinated rollout; verify it matches the implemented state transitions.

## 4. Pre-match state replication

- [x] 4.1 Treat waiting and countdown as metadata-only roster views in `VisibilitySerializer`, copying readiness and countdown/cancellation state; verify two-client wire-level tests show both teams' complete rosters and ready status throughout countdown without canonical coordinates or gameplay entities.
- [x] 4.2 Update transition/reset handling for waiting-to-countdown, countdown-to-waiting, and countdown-to-started; verify replication tests retain the complete cancelled lobby roster and resume normal fog-of-war filtering only after actual start.

## 5. Team panels and client readiness/countdown experience

- [x] 5.1 Render bounded, clearly distinct Team Red/Team Blue panels with headings, counts, aligned names/roles/statuses, empty states, and green graphical checkmarks plus ready labels; verify layout with empty teams, long valid names, ten players on one team, and resized viewports.
- [x] 5.2 Add `Bereit`/`Nicht bereit` controls and derive team/role availability from authoritative local readiness and phase; add focused frontend state/interaction tests and verify ready checkmarks synchronize without rejected changes appearing accepted.
- [x] 5.3 Show start only to the host and enable it only in waiting when every participant including the host is ready; verify host/peer/not-ready permutations, readiness revocation, newcomer joins, and host succession update the control correctly.
- [x] 5.4 Route countdown through the pre-match view, display server-derived 5-to-1 seconds, lock configuration/readiness/start controls, retain leave, and create the arena only on started; verify interaction tests cover every locked action and cancellation restores the correct controls with an explicit reason.
- [x] 5.5 Clean up menu inputs, state listeners, countdown presentation, and any layout scrolling resources on exit/start/scene shutdown; verify repeated create/join/leave and cancelled/restarted countdown flows do not accumulate UI or handlers.
- [x] 5.6 Update existing player-facing lobby instructions for name entry, team panels, checkmarks, reversible readiness, and start/cancellation behavior; verify the documented flow against the finished UI.

## 6. Cross-workspace integration

- [x] 6.1 Run affected shared, registry, lobby-control, room-lifecycle, serializer, and frontend tests with the existing runners, followed by the workspace build; verify no type/protocol mismatch and register new test files in explicit package test lists where required.
- [x] 6.2 Run a real two-client flow: create a named lobby, join, change teams/roles, toggle readiness, deny early host start, complete a synchronized five-second countdown, and enter gameplay together; verify the lobby name never changes and simulation is inactive before completion.
- [x] 6.3 Run real multi-client cancellation flows for both host and non-host departure during countdown, attempt a stale-list join, then explicitly restart; verify no duplicate room, correct roster/host/readiness/listing recovery, no start at the old deadline, and successful later start.
