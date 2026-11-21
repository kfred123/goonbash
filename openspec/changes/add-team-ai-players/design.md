# Design

## Context

See proposal.md for motivation and scope. `GameRoom` runs the authoritative simulation at 60 Hz, stores tanks and player statistics keyed by the Colyseus session ID, and currently removes a tank in `onLeave`. Client command handlers and `VisibilitySerializer` also use that session ID to find the participant's tank. The current lobby registry counts connected clients for seat capacity.

Team visibility is already computed server-side through `TeamVision` and is used by targeting, command validation, and each client's state projection. The frontend creates a room with `joinOrCreate` and attaches gameplay listeners to that room. The repository uses Colyseus 0.15.17 and colyseus.js 0.15.9.

## Goals / Non-Goals

**Goals:**
- Keep bots and humans in the same authoritative tank simulation and public roster.
- Keep each bot's decision inputs restricted to its team's current visibility.
- Preserve tank state and participant statistics across human-to-bot control transfer.
- Allow a disconnected participant to reclaim the same tank during the 30-second grace period.
- Keep bot capacity and lobby readiness separate from connected-human lifecycle and host authority.

**Non-Goals:**
- External or language-model-based AI, persistent learning, matchmaking, or dynamic difficulty.
- Adding bots after the match starts; after start, bots only take over from a departing participant.
- Changing combat rules, role statistics, sight ranges, or existing fog-of-war presentation.
- Keeping a room alive solely because bots remain after all humans have left.

## Decisions

### Represent each bot as a normal tank with explicit controller metadata

Bots SHALL use the existing `Tank` and match-statistics state, with public controller type and difficulty fields for lobby and match presentation. A bot added by the host receives a unique room-local participant ID, a selected team and role, a generated display name, and ready state. It is included in team rosters, progression, combat, and results like any other participant.

For a human participant, the existing session ID remains the participant/tank ID. On an unexpected disconnect during a started match, keep that tank and its statistics in canonical state while Colyseus holds the session for reconnection. Successful reconnection restores control of the same ID; expiration changes only its controller metadata. An intentional leave changes the controller immediately. This avoids rekeying every tank reference and preserves existing client and visibility-serializer identity behavior. Verify that the pinned 0.15 client/server reconnection path preserves the session ID; if it does not, add an explicit session-to-participant mapping rather than creating a second tank.

During the grace period, the tank keeps its last accepted movement/target intent and continues through normal server simulation. No new human commands are accepted while disconnected. After takeover, the bot can update that intent.

### Keep human connections distinct from occupied seats

The room roster is the source of truth for participants. Lobby capacity is the count of connected humans plus lobby bots; team balancing includes both. Bots are ready by default. The lobby registry must retain a separate count of connected humans for join/leave lifecycle and empty-room cleanup, while its seat-availability status uses occupied seats. A bot never becomes a host; host succession considers only connected human clients. If no human remains in a waiting lobby, bots do not keep that lobby alive.

Only the current human host may add or remove bots, and only while waiting. The client exposes those controls and a bot label/difficulty in the existing team roster; the server validates host, phase, role, team, difficulty, and capacity independently of the UI.

### Build bot decisions from a visibility-limited observation

The AI policy receives a purpose-built observation containing the bot's own tank, allied entities, and only currently team-visible enemies, plus the minimum visible world/objective data needed for a decision. Construct it from the same `TeamVision` rules used by combat and replication. Do not pass `GameState`, unfiltered maps, or hidden target IDs to the policy. Tests should establish that two canonical states differing only in concealed enemy data produce identical bot observations and decisions.

The policy returns high-level intents such as move to a point, lock a visible target, or activate a role ability. Factor the gameplay action logic so human message handlers and AI intents share server-side validation and state changes without creating fake network clients. Existing automatic combat selection remains responsible for firing once targets meet current visibility and range rules.

Difficulty is implemented as deterministic policy depth, not altered unit statistics: easy selects a nearby visible threat and uses abilities conservatively; medium weighs visible objectives and role abilities; hard may coordinate positioning or target focus using only visible allied and enemy state. Run decisions at bounded intervals within the existing room loop rather than once per render frame. Tune intervals and priorities through gameplay tests without changing the observation boundary.

### Use Colyseus reconnection for temporary disconnects

For an unexpected disconnect in a started match, use the pinned Colyseus reconnection flow with a 30-second reservation. Keep the existing participant state while waiting. If reconnection succeeds, restore the human controller and send a fresh visibility-scoped state; if the reservation expires, switch to bot control and reject use of the expired reconnection authority. An intentional leave skips the reservation and immediately switches to bot control.

The frontend must retain the room's current reconnection token for the active page session, attempt the supported reconnect path, and reattach state/message listeners to the returned room. Do not persist the token beyond the active session or log it. The token is a bearer secret: possession authorizes reconnection, and a stolen valid token cannot be distinguished from the original holder. Confirm behavior against the repository's exact Colyseus 0.15 versions in an integration test before relying on lifecycle callback semantics.

### Preserve visibility-scoped presentation

Replicate bot controller metadata as public roster information through the existing explicit client projection. The bot policy's private observation is separate from that projection and is never serialized to clients. On reconnect, create a fresh client view from canonical state and current team membership; do not reuse an old projected view or permit hidden state accumulated during the disconnect to leak.

## Risks / Trade-offs

- [The Colyseus 0.15 reconnect callbacks or token behavior differs from assumptions] → Verify reconnect, timeout, and intentional-leave flows with the installed client/server versions before implementing takeover; keep a fallback explicit session-to-participant mapping as a planned alternative.
- [Bot decision code accidentally reads canonical state] → Give the policy only a narrow observation value and test that hidden enemy changes cannot affect its output.
- [Bot seats cause lobby capacity and connected-player counts to drift] → Track human connections and bot seats separately; test joins, bot add/remove, host departure, and empty-room cleanup.
- [60 Hz AI decisions increase CPU cost] → Keep AI decisions server-side but bounded to a lower cadence than simulation; measure with the maximum lobby occupancy.
- [Control transfer loses match credit] → Preserve the original tank/statistics identity and test damage, kills, progression, reconnect, and takeover together.

## Migration Plan

1. Add controller and difficulty state plus bot-aware lobby capacity while preserving the existing human session-to-tank key.
2. Add the visibility-limited deterministic bot policy and route its intents through shared authoritative action logic.
3. Add the 30-second reconnect reservation and immediate intentional-leave takeover, with lifecycle integration tests on the pinned Colyseus versions.
4. Add lobby roster controls and verify initial/delta visibility projections and final participant statistics.
5. Roll back the feature as a unit if reconnect or visibility tests fail. No persisted database migration is required.

## Open Questions

- Exact decision cadence and target-priority tuning for easy, medium, and hard should be settled through gameplay tests; these values do not change the required difficulty or visibility contracts.
