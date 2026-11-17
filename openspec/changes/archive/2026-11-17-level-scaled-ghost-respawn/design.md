# Design

## Context

See `proposal.md` for motivation and `specs/player-respawn/spec.md` for the behavioral contract.

`Tank` already synchronizes `state: "alive" | "dead"` and an absolute `respawnAt` timestamp. `GameRoom.killTank` clears actions and active abilities but currently schedules a constant 3,000 ms wait without relocating the tank. `resolveRespawns` uses `respawnTank` to select a new base-adjacent position at completion.

`VisibilitySerializer` already includes allied dead tanks and excludes enemy dead tanks, but shares allied respawn deadlines with the whole team. `GameScene.upsertTank` hides dead sprites, and the per-frame visibility pass reapplies presentation rules. Both paths must agree on the preview without exposing health bars or combat effects. Combat, healing, input, and vision already distinguish dead tanks.

## Goals / Non-Goals

**Goals:**
- Keep the server as the only authority for death, timing, spawn position, and reactivation.
- Reuse the existing dead-state representation and schema fields.
- Separate noncombat preview visibility from living combat presentation.
- Cover timing, replication, and presentation with deterministic tests.

**Non-Goals:**
- No manual respawn, spectator controls, new life-state enum, or configurable delay curve.
- No changes to progression rewards, learned abilities, existing cooldown behavior, fog rules, or minimap dead-unit markers.
- No third-party dependencies or separate network countdown messages.

## Decisions

### 1. Treat the preview as the existing dead tank

Keep `state === "dead"` and zero HP throughout the wait. Retain current server guards for commands, movement, firing, targeting, ability activation, upgrades, healing, and vision. Clear movement destinations, locks, outgoing targets, and active ability durations as today. Existing in-flight projectiles fired before death retain their current behavior; the preview cannot fire new ones.

Choose this over a new `ghost` state or second entity because either would duplicate identity and require updating every life-state guard. Preview visibility does not make the tank an active combat entity.

### 2. Select the return position once, on death

Use `nearBasePosition` with the tank's own main base and existing world bounds during the death transition. Retain the current random radius and structure-exclusion rules. Completion restores HP, state, and deadline without rerolling coordinates. Refactor `respawnTank` or its call sites so its existing reposition-on-completion behavior cannot accidentally introduce a second teleport.

Capture the original victim position before relocation, as the damage path already does, and keep kill XP based on that position. Tests must distinguish nearby recipients at the death site from players at the preview site.

This avoids a detached client-only preview whose position could disagree with the authoritative spawn.

### 3. Compute a deadline once per death

Replace `RESPAWN_DELAY_MS` with a small testable level-to-delay calculation: `level * 2_000` milliseconds, using the authoritative current level when death occurs. Set `respawnAt = deathTime + delay`. There is no added base delay or cap.

Keep the existing simulation-time deadline comparison. Do not create per-player timeout callbacks: the existing started-match loop already prevents respawns after match end. Clear `respawnAt` on successful respawn. Do not change or pause ordinary ability cooldown deadlines.

### 4. Retain allied-only projection and make the deadline owner-only

Continue projecting dead tanks to their owner and teammates, and continue excluding them from enemy projections even inside enemy vision. Change `respawnAt` projection to `own ? tank.respawnAt : 0`, including zeroing non-owner projected values on every copy.

This keeps the countdown private at the replication boundary rather than merely hiding teammate UI. No schema migration is required. Replication tests should exercise actual full-state and patch behavior, not only canonical state.

### 5. Render the preview independently of combat attachments

Give allied dead tank figures an explicit presentation path in `GameScene`, including both initial upsert and per-frame visibility. Apply alpha `0.5` to the complete role-specific figure and restore `1` on alive state. Keep health bars, active ability decorations, firing effects, and attack selection disabled. Existing allied name labels can remain above the figure; place the countdown above them to avoid overlap.

Render preview figures, their names, and the owner countdown above the world fog overlay, so fog does not further dim the half-opaque preview or obscure the timer. The terrain underneath remains concealed and the preview grants no vision. Restore ordinary entity/name depths on revival. Renderer regression checks must include the actual fog overlay in Canvas and WebGL, not just assert the sprite's visibility flag.

Keep generic living-unit, targeting, vision, and minimap predicates unchanged wherever possible. Do not broadly redefine dead units as visible combat entities. If a shared presentation helper is changed, audit its consumers so it cannot create minimap markers or selectable targets.

Snap the rendered figure and interpolation target to the new authoritative position on an alive-to-dead transition and preserve camera follow. Camera easing may retain its normal behavior, but the figure must not interpolate across the battlefield. On respawn, keep the same position.

### 6. Use one owner-local countdown label

Create or update a world-space label only for the local dead tank in a started match. Derive its text each render update from `max(0, ceil((respawnAt - now) / 1_000))` followed by `s`, and position it relative to the rendered figure. Use the existing client absolute-time convention used for ability deadlines; local display never controls the authoritative transition.

Destroy the label on alive state, tank removal, room exit/scene cleanup, and results presentation. At zero, keep the preview inactive until the server sends alive state. This avoids drifting decrement timers and accumulating interval resources.

## Risks / Trade-offs

- [Independent visibility passes reveal health bars or hide previews] -> Centralize the tank-specific presentation decision and test both upsert and per-frame application.
- [Clock skew affects displayed seconds] -> Follow existing absolute-time UI conventions and clamp at zero; only the server can reactivate the tank. General clock synchronization remains outside this change.
- [Relocation changes XP recipients] -> Keep the original death-position snapshot and test distant death/preview locations.
- [Changing respawn helpers alters initial spawning] -> Keep joining-player placement unchanged and add regression coverage for current near-base bounds and role/progression restoration.
- [An enemy already has the victim in a previous snapshot] -> Verify the next patch removes that tank rather than revealing its new base position.
- [Delayed state updates] -> "Immediate" means on the next authoritative client update; no speculative client relocation or resurrection.

## Migration Plan

No persisted data migration or dependency change is required. Ship backend timing/projection changes and frontend preview/countdown changes together, and refresh existing client sessions to avoid mixed presentation behavior. Update the directly related respawn documentation during implementation.

Rollback by reverting the implementation and restoring fixed-delay, hidden-dead-tank behavior together. Do not amend unrelated specifications or archived changes.
