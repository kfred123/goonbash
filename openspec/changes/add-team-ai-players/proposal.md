# Proposal

## Why

Private matches need computer-controlled teammates and opponents so hosts can fill teams, and a match should not lose a participant's tank when that player disconnects. Bots should use the existing server-authoritative gameplay and team vision rules, so difficulty changes decision quality rather than granting information through the fog of war.

## What Changes

- Let the host add and remove difficulty-configured computer players from either team while the lobby is waiting.
- Add easy, medium, and hard server-controlled players that use normal tank roles, movement, combat, and abilities while observing only their team's currently visible world.
- Let a disconnected player reclaim their existing tank for 30 seconds; after the grace period, transfer that tank to bot control. An intentional leave transfers control immediately.
- Keep participant identity and match statistics stable when control changes, and ensure bot participants do not become lobby hosts.
- Count bots toward lobby seat capacity and readiness without counting them as connected human clients.

## Capabilities

### New Capabilities
- `computer-controlled-players`: Difficulty-based server AI, team-scoped observations, and human-to-bot control transfer.

### Modified Capabilities
- `lobby-team-management`: Host-only bot management in waiting lobbies, bot readiness and capacity, and human-only host succession.
- `game-backend`: Run bot actions through authoritative gameplay and preserve a tank and its statistics through controller changes.
- `multiplayer-networking`: Support a 30-second reconnect grace period before bot takeover of a disconnected participant's tank.

## Impact

- Affected systems: shared participant/game state, Colyseus lobby and room lifecycle, server simulation and AI decisions, visibility-scoped state replication, client lobby roster and reconnect flow, match results, and focused backend/frontend tests.
- No new runtime service or external AI dependency is required. Existing `TeamVision` and server-side command validation remain authoritative.
