# Tasks

## 1. Bot participants and lobby management

- [x] 1.1 Add synchronized controller-type and bot-difficulty metadata to participant state; verify human defaults and bot roster fields with shared-state tests.
- [x] 1.2 Add host-authorized bot creation/removal for waiting lobbies, validating team, role, difficulty, phase, and total occupied seats; verify rejection and capacity cases with room tests.
- [x] 1.3 Track human connections separately from bot seats for lobby capacity, host succession, and empty-room cleanup; verify mixed-roster joins, team balancing, readiness, and cleanup with LobbyRegistry and lifecycle tests.
- [x] 1.4 Add lobby roster labels and host controls for adding/removing bots; verify the UI control model with frontend tests and the frontend build.

## 2. Visibility-limited bot behavior

- [x] 2.1 Build a narrow bot observation from current team vision instead of passing canonical GameState; verify that changing only concealed enemy data does not change the observation or bot decision.
- [x] 2.2 Implement deterministic easy, medium, and hard decision policies using visible targets, role abilities, and shared validated action logic; verify difficulty behavior, invalid-action rejection, and no fog-of-war targeting with backend tests.
- [x] 2.3 Integrate bounded bot decision updates into the authoritative room loop; verify bot movement and combat continue to obey existing simulation, range, and cooldown rules.

## 3. Reconnection and control transfer

- [x] 3.1 Implement the 30-second Colyseus reconnect reservation for unexpected disconnects and immediate takeover on intentional leave; verify reconnect, timeout, and leave behavior with tests using the pinned client/server versions.
- [x] 3.2 Preserve the same tank and participant statistics during human-to-bot and bot-to-human control changes; verify position, role, team, progression, damage, and kill continuity.
- [x] 3.3 Add client reconnect-token handling and reattach state/message listeners after reconnection; verify that a returning client controls only its original tank and receives a fresh visibility-scoped state.

## 4. End-to-end verification

- [x] 4.1 Exercise a mixed human/bot lobby through match start, fog-limited play, disconnect takeover, and match results; verify bot seats, human-only host authority, and per-team state projections.
- [x] 4.2 Run the focused backend and frontend test suites plus shared, backend, and frontend builds; verify all affected packages pass together.

## 5. Bot ability and positioning follow-up

- [x] 5.1 Distribute earned skill points across the role's abilities and use learned self, target, and point abilities in useful situations through the same validation as human requests.
- [x] 5.2 Make medium and hard bots break pursuit when threatened, seek a position behind a nearby ally or withdraw without one, and return to normal play when safe; verify the behavior uses only team vision.
