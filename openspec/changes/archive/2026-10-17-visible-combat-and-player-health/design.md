## Context

The backend (`GameRoom.ts`) runs a 60 FPS authoritative simulation over Colyseus `Schema` state (`shared/src/state/*`). Today `Entity` only carries position/team/radius; `Tank` and `Minion` carry HP fields that are never read or written outside of their default values. The game loop moves tanks from player input and moves minions toward a single waypoint, but nothing ever deals damage, spawns projectiles, or removes/respawns anything. The frontend (`GameScene.ts`) mirrors `tanks` and `minions` maps into Phaser sprites but has no concept of projectiles, health bars, or death.

This change adds a real-time combat loop (targeting, firing, projectile travel, collision, damage, death/respawn) on top of the existing fixed-tick simulation, and the matching client-side rendering.

## Goals / Non-Goals

**Goals:**
- Give every combat-capable unit (minions, player tanks) automatic target acquisition and periodic firing at the nearest valid enemy in range.
- Represent shots as first-class networked entities (`Projectile`) so the client can render them traveling from shooter to target, rather than inferring hits from HP deltas.
- Ensure targeting/pathing/firing logic only treats enemy-team entities as obstacles or valid targets; friendly units never block a shot or a target selection.
- Add player HP depletion, death (removal from arena), a respawn timer, and reappearance at the player's team base with full HP.
- Keep all combat resolution server-authoritative; the client only renders state it receives.

**Non-Goals:**
- No new weapon types, ability system changes, or per-role damage rules beyond what already exists (role-specific stats stay as-is; this change wires the existing HP/role fields into an actual combat loop).
- No client-side prediction/rollback for projectiles; a small amount of visual latency is acceptable given the 60 FPS server tick and interpolation already used for tanks.
- No changes to lobby/team-selection flows.
- No persistent scoring/kill-feed UI (can be a follow-up change).

## Decisions

### 1. New `Projectile` schema type synced via a `MapSchema`
Add `shared/src/state/Projectile.ts` (`id`, `x`, `y`, `team`, `ownerId`, `targetId`, `damage`, `speed`) and a `@type({ map: Projectile }) projectiles` field on `GameState`, following the same pattern as `minions`/`tanks`. Alternative considered: encode shots as ephemeral events instead of persisted state. Rejected because Colyseus schema diffing already gives us reliable, replicated, interpolatable positions for free, matching how minions/tanks are already handled — no new transport mechanism needed.

### 2. Server-side targeting is per-tick nearest-enemy-in-range, ignoring teammates entirely
Each tick, every alive unit with a `fireRange`/`fireCooldown` looks at `tanks` + `minions` + enemy `bases` filtered to `team !== self.team` and picks the nearest one within range. Friendly units are excluded from this filter set entirely, so they can never be selected as a target and never "block" target acquisition. Projectile travel is a straight line from shooter to the target's *current* position at fire time (non-homing, unlike the existing Homing Rocket ultimate); since friendlies are never considered for collision either, they cannot intercept/block a shot in flight.
Alternative considered: physical collision/line-of-sight blocking by any unit in the path. Rejected for this change — it would require spatial raycasting against friendly geometry, which directly conflicts with the "friendly units should not block" requirement and adds complexity not needed for the requested behavior.

### 3. Player tanks reuse the same combat component as minions
Rather than a separate "player combat" code path, tanks get the same `fireRange`, `fireCooldown`, `fireDamage` fields as minions and are processed by one shared `resolveCombat()` step in `GameRoom.update()`. This guarantees minions-vs-tanks and tanks-vs-tanks symmetry (a tank is attackable by minions and enemy tanks using identical logic) with a single code path to maintain.

### 4. Death & respawn as tank state transitions, not entity removal from the map
On HP ≤ 0: the tank is marked `state: "dead"`, is skipped by targeting/rendering (frontend hides it), and a server-side `respawnAt` timestamp is set (e.g., now + 3000 ms). When `update()` observes `now >= respawnAt` for a dead tank, it resets `hp = maxHp`, moves `x/y` to the team's base position, and sets `state: "alive"`. Alternative considered: `delete` the tank from `state.tanks` and re-add on respawn. Rejected because it churns Colyseus `onAdd`/`onRemove` listeners and sprite lifecycles on the client for what is really just a state flag; keeping the same schema instance is simpler and avoids client-side flicker/reset of unrelated UI (name tag, etc.).

### 5. Health bars rendered client-side from existing `hp`/`maxHp` fields
No new schema needed for the bar itself; `GameScene.ts` draws a small rectangle above each tank/minion sprite sized by `hp / maxHp`, updated whenever the schema fields change. Projectiles get a lightweight sprite (small circle/rect) created on `projectiles.onAdd` and removed on `onRemove`.

## Risks / Trade-offs

- [Risk] Adding a `projectiles` MapSchema that churns frequently (spawned/removed every shot) could increase network traffic noticeably at high unit counts. → Mitigation: cap simultaneous projectiles per unit (only one in flight per shooter) and keep projectile lifetime short (despawn on hit or range-exceeded).
- [Risk] Nearest-enemy-in-range targeting can cause visually "unfair" focus fire on a single player by multiple minions at once. → Mitigation: out of scope to rebalance in this change; damage/HP values can be tuned later without touching the targeting architecture.
- [Risk] Marking dead tanks as still present in `state.tanks` (rather than removing them) means client code must explicitly check `state === "dead"` everywhere it currently assumes "present == alive". → Mitigation: centralize this check in a single `upsertTank`/render-loop guard in `GameScene.ts`.
- [Risk] Respawn teleport to base could immediately re-expose the player to point-blank enemy fire if the base is contested. → Mitigation: not addressed in this change (no invulnerability window); flagged as an Open Question below.

## Migration Plan

- Additive schema changes (`Projectile` type, new fields on `Entity`/`Tank`/`Minion`) are backward compatible; no existing persisted state to migrate (match state is ephemeral per room).
- Roll out backend and frontend together, since the client relies on the new `projectiles` map and tank `state` field existing.
- No feature flag: this is the core combat loop the game currently lacks, so it ships enabled by default once merged.

## Open Questions

- Should respawned players get a brief invulnerability or spawn-protection window? (Deferred; not required by the current ask.)
- Should bases/towers themselves participate in `unit-combat-targeting` (i.e., shoot at nearby enemies)? Resolved: bases are now valid *targets* for minions and tanks (they take damage and their HP bar depletes), but bases remain passive and never fire back; base destruction/win-condition handling is still out of scope.
