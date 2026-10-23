# Tasks

## 1. Authoritative death and respawn lifecycle

- [x] 1.1 Replace the fixed delay with a testable `level * 2_000` millisecond calculation in the backend combat lifecycle and set the deadline once at death; verify levels 1, 5, and 10 yield exactly 2, 10, and 20 seconds and a later death uses its own current level and timestamp.
- [x] 1.2 Move base-adjacent position selection into the death transition in `GameRoom.ts`, reuse the existing positioning rules, and stop relocating at completion; verify both teams' previews are outside their base structure and within world bounds, initial joining-player placement remains unchanged, and completion preserves the preview coordinates.
- [x] 1.3 Add lifecycle regression coverage alongside the backend changes for zero-HP inactivity, cleared targets/movement/active abilities, no queued commands, no targeting/damage/healing/vision, preserved role/progression/ability levels, and XP at the original death location; verify with the backend's existing test runner.
- [x] 1.4 Cover deadline boundaries and phase handling in backend tests: remain dead immediately before expiry, restore full current maximum HP at the first eligible update at/after expiry, clear the deadline, and never reactivate after match end; verify the targeted lifecycle tests pass.
- [x] 1.5 Update existing player-facing respawn documentation in `readme.md` where applicable; verify it states immediate allied-only previews and `level * 2 seconds`, with no remaining contradictory fixed-delay description in that documentation.

## 2. Recipient-specific replication

- [x] 2.1 Make `respawnAt` owner-only in `VisibilitySerializer.ts` while retaining allied dead-tank projection and enemy exclusion; add owner/teammate/enemy tests proving only the owner receives the exact deadline and enemies cannot receive a preview even inside vision.
- [x] 2.2 Extend serializer full-state and patch tests through alive-to-dead-to-alive transitions; verify previously visible enemy tanks are removed on death without leaking preview coordinates, allied previews stay present, non-owner deadlines remain zero, and living visibility returns after respawn.

## 3. Translucent figure and private countdown

- [x] 3.1 Update initial tank rendering and per-frame visibility in `GameScene.ts` to show allied dead role figures at alpha `0.5` while keeping combat attachments and selection disabled; add presentation regression tests verifying no health bar, firing/ability effects, enemy preview, extra minimap marker, or combat hit region appears.
- [x] 3.2 Snap the rendered figure and interpolation target to the preview coordinates on death while preserving local camera follow, and restore normal opacity/health presentation on alive state without repositioning; verify transition tests cover both owner and teammate figures and a manual camera check confirms no figure traverses the map.
- [x] 3.3 Add one owner-local overhead countdown driven by the authoritative deadline during render updates; test `4.2 seconds -> 5s`, exact whole-second boundaries, zero clamping, attachment positioning, and absence on teammate clients, and verify a zero display does not enable control before alive confirmation.
- [x] 3.4 Clean up countdown presentation on respawn, tank removal, room leave/scene cleanup, and match results, and keep existing movement/attack/ability input guards; verify repeated death/respawn cycles do not duplicate labels and all cleanup paths remove them.
- [x] 3.5 Complete the directly related UI documentation alongside the frontend work; verify the description distinguishes the team-visible figure from the owner-only countdown and does not imply that the preview can act.

## 4. Cross-surface integration

- [x] 4.1 Run the affected backend, frontend, and shared regression tests with existing workspace runners, then `npm run build`; verify all affected suites and TypeScript builds pass without adding dependencies.
- [x] 4.2 Exercise a multiplayer match with an owner, teammate, and enemy for both teams at levels 1 and 5; verify immediate near-base previews, 2/10-second server waits, owner-only countdowns, enemy concealment, inactivity, same-position full-health return, and no respawn/countdown after match end against every changed requirement.
