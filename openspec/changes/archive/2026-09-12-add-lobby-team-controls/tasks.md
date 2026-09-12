## 1. Shared lobby state

- [x] 1.1 Add typed Colyseus state for match phase, lobby name, host session ID, and the synchronized player-team roster.
- [x] 1.2 Define red and blue team values and assign each joining player to the currently smaller team, choosing red for a tie.
- [x] 1.3 Update shared lobby contracts to expose the renamed lobby in server-browser responses.

## 2. Authoritative room controls

- [x] 2.1 Update `GameRoom` to initialize a waiting lobby, set the first joining player as host, and publish roster updates on joins and leaves.
- [x] 2.2 Add validated room messages that let a waiting-lobby player change only their own team.
- [x] 2.3 Add host-authorized room messages for renaming the lobby and starting the match, and add a registry rename operation.
- [x] 2.4 Gate tank movement and minion spawning on the started phase while preserving normal simulation after the host starts the match.
- [x] 2.5 Add backend tests for balanced assignment, team-change validation, host-only rename/start authorization, registry name updates, and phase-gated simulation.

## 3. Waiting-lobby client

- [x] 3.1 Render the synchronized waiting-lobby name, roster, team membership, and local red/blue selection controls in `GameScene`.
- [x] 3.2 Show rename and start controls only for the synchronized host, and send the corresponding room messages.
- [x] 3.3 Transition every client from the waiting-lobby view to the existing arena when the synchronized match phase becomes started.
- [x] 3.4 Build the shared package and frontend to verify type safety and the production bundle.
