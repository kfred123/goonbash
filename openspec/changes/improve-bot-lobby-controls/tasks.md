# Tasks

## 1. Authoritative bot team changes

- [x] 1.1 Add `change_bot_team` handling in `backend/src/rooms/GameRoom.ts` with validated bot ID, destination, current human host, and waiting phase; verify bidirectional moves, same-team no-op, and rejection of malformed payloads, missing bots, human targets, non-hosts, former hosts, and countdown/started/ended requests in existing lobby lifecycle tests.
- [x] 1.2 Preserve the existing bot object and metadata while updating both tank and match-statistics teams without registry seat changes; verify identity, name, role, difficulty, readiness, occupancy, human count, subsequent join balancing, and correct match-start team placement in focused room tests.

## 2. Team-local bot creation popup

- [x] 2.1 Replace global bot setup navigation with an add action inside each team panel and a team-scoped popup draft in `frontend/src/GameScene.ts`; extend the existing presentation tests to verify red/blue targeting, medium/Damagedealer defaults, supported role/difficulty selection, capacity gating, and waiting-human-host authorization independent of readiness.
- [x] 2.2 Render a compact popup above the still-visible lobby with a blocking backdrop, confirmation, cancellation, and Escape handling; verify cancellation sends nothing, confirmation sends the originating team and selected values, background controls cannot fire, and leaving/teardown disposes popup objects and listeners.
- [x] 2.3 Integrate popup state with lobby redraws and live authority/capacity checks; verify drafts survive authorized roster updates, confirmation disables when the lobby fills, authority or phase changes discard the popup, server errors remain visible, and no unconfirmed bot appears in the roster.

## 3. Bot row actions and roster layout

- [x] 3.1 Replace the small `X` with separate `Team wechseln` and `Entfernen` buttons after bot details, using current-state permission and target checks; verify correct bot IDs and opposite-team payloads in frontend tests and confirm human/non-host rows have no bot actions.
- [x] 3.2 Adapt row spacing and implement bounded team-roster scrolling with clipped rendering and hit targets while retaining a fixed add-button area; visually verify empty teams, long names, mixed rosters, all ten seats on one team, viewport scaling, and non-overlapping reachable actions.
- [x] 3.3 Ensure popup closure and bot controls refresh correctly after synchronized adds, moves, removals, host changes, capacity changes, and countdown transitions; verify existing readiness, human team/role locks, leave behavior, and countdown UI remain intact.

## 4. Integration verification

- [x] 4.1 Exercise host and non-host clients together: add bots to both teams with different difficulties/roles, switch in both directions, remove, fill and free seats, and start a match; verify every client agrees on roster, counts, metadata, and resulting gameplay teams.
- [x] 4.2 Run the focused frontend lobby presentation and backend lobby lifecycle tests plus the affected shared/backend/frontend builds using existing package scripts; verify the new protocol and popup lifecycle integrate without regressions.

## Workflow follow-up

- When consolidating specifications after implementation and review, archive the implemented `add-team-ai-players` baseline before this change.
