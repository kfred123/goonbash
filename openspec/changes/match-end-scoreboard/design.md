# Design

## Context

The backend currently synchronizes a `waiting` or `started` match state. Main bases remain in the state at zero HP, so their destruction does not end the game. Projectile damage already has an owner ID, but player kills and damage are not recorded, and tanks are removed from the room when their players leave. The frontend observes synchronized state changes and builds its menus and arena UI in Phaser. See `proposal.md` and the spec deltas for the required behavior.

## Goals / Non-Goals

**Goals:**
- Keep the match outcome and final participant statistics authoritative and synchronized for every client.
- Attribute statistics to the player who fired the damaging projectile and preserve them through the results screen.
- Reuse the existing Phaser menu and room-leave flow for the results UI.

**Non-Goals:**
- Introduce player accounts, persistent statistics, progression, or a match-leveling system.
- Add a rematch flow or change lobby/team selection behavior.

## Decisions

- Add an ended match phase and a synchronized winner-team field to shared game state. On the first main-base destruction, set the outcome and stop the simulation; gate all gameplay actions on the match still being started. A one-off network message was rejected because late state observers would not reliably receive the result.
- Store player name, team, kills, level, and damage dealt in a dedicated synchronized per-player match-statistics collection keyed by session ID. Initialize records when players join and retain them if a tank leaves, so disconnecting does not erase a participant from final results. Storing these values only on tanks was rejected because tanks are removed on leave.
- Update statistics at projectile impact using the actual hit-point reduction after damage mitigation. Credit damage only to a known player firing at an opponent, and credit a kill when that damage eliminates an opposing player tank. This avoids counting overkill, friendly damage, and non-player combat as player performance. Give every player level 1 for this feature; a progression system is explicitly out of scope.
- When the frontend observes the ended phase, replace the arena HUD with one victory/defeat results screen and two team scoreboards. Keep sort selection local to each table, default to kills descending, and toggle direction when the same column is selected again. Use the existing room-leave and main-menu navigation path for the return action.

## Risks / Trade-offs

- **Level values are identical in this change** → Keep the level column and sorting behavior as requested, while clearly limiting level to 1 until progression is designed separately.
- **Shared state shape changes affect both client and server** → Deploy compatible backend and frontend builds together; no persistent data migration is needed.
- **Results exist only for the lifetime of the room** → Keep the room state intact while connected clients view results; persistent match history is outside this change.

## Migration Plan

No stored data migration is required. Deploy the backend and frontend changes together. Rolling back removes the new result flow and synchronized statistics; any active results are ephemeral and are not preserved across a rollback.
