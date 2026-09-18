## Context

The game runs an authoritative Colyseus server (`backend/src/rooms/GameRoom.ts`) with a fixed 60 FPS simulation loop (`update(deltaTime)`). Shared state schemas live in `shared/src/state/*` (`Entity`, `Minion`, `Base`, `Tank`, `GameState`) and are synced automatically to clients via `@colyseus/schema`.

Today: two `Base` entities (`blue-base`, `red-base`) spawn one `Minion` each every 5 seconds; minions walk in a straight line from their own base directly to the enemy base's position, ignoring everything else, and never take or deal damage. There are no lanes, no towers, and no combat resolution between minions.

This design adds Main Towers, three lanes with per-lane waypoint paths, periodic per-lane mob spawning, nearest-enemy auto-targeting/combat for mobs, and destructible towers — all driven by configurable numeric parameters.

## Goals / Non-Goals

**Goals:**
- Two Main Towers (one per team) that spawn mobs and can be destroyed.
- Three lanes (top, mid, bottom); every 15s each tower spawns one mob per lane.
- Mobs move along a lane's waypoint path toward the enemy tower.
- While moving, a mob continuously looks for the nearest enemy unit within attack range; if found, it stops and attacks that unit until it dies or leaves range, then resumes movement.
- Mobs that reach the enemy tower attack it until destroyed.
- All gameplay numbers (spawn interval, mob HP/damage/speed/attack range, tower HP/damage/attack range) are defined in one configurable place, not hardcoded inline.

**Non-Goals:**
- Player (Tank) combat abilities, XP, or leveling changes — out of scope, though players count as valid attack targets for mobs/towers per existing "Global Rule" range constraints.
- Visual/art assets for towers or lanes on the client — only the data model and server logic are covered; client rendering is a follow-up task.
- Matchmaking, win-condition UI/game-over screen — destroying a tower is tracked in state, but end-of-match flow is out of scope.
- Multiple towers per lane (turrets) — only the single Main Tower per team is in scope.

## Decisions

1. **Reuse `Entity` as the common base for combat units.** `Tower` and the extended `Minion` (renamed conceptually to "mob") both extend `Entity`, which already provides `id`, `x`, `y`, `radius`, `team`. This lets targeting code treat mobs, towers, and tanks uniformly via a shared interface rather than duplicating position/team fields.
   - *Alternative considered*: a separate non-Schema combat layer outside colyseus state. Rejected because targeting/HP must be visible to clients for HUD/health-bar rendering, and `Entity` already syncs over the network.

2. **Model lanes as static waypoint arrays per team, not dynamic pathfinding.** Each lane (top/mid/bottom) is a short ordered list of `{x, y}` waypoints from a team's tower to the enemy tower. Mobs walk toward their next waypoint using the same vector-normalize-and-step approach already used in `update()`.
   - *Alternative considered*: full pathfinding/navmesh. Rejected as unnecessary complexity for a straight-lane MOBA layout; static waypoints match the existing straight-line movement code style and are trivially configurable.

3. **Central `CombatConfig` object holds all tunable numbers** (spawn interval ms, mob speed/hp/damage/attackRange, tower hp/damage/attackRange, attack cooldown). Introduced as a single exported constant (e.g. `shared/src/config/CombatConfig.ts`) consumed by `GameRoom.ts`.
   - *Alternative considered*: hardcoded literals inline (current style for the 5000ms spawn timer). Rejected per explicit requirement that "Alle Werte sollen später anpassbar sein" (all values must be adjustable later).

4. **Targeting is nearest-enemy-in-range, re-evaluated every tick.** Each mob (and tower, for towers that can attack) each simulation tick scans all opposing-team `Entity`-derived units (mobs, towers, tanks) within `attackRange`, picks the closest by Euclidean distance, and sets `targetId`. If no enemy is within range, `targetId` is cleared and the mob resumes moving. This is simple, deterministic, and cheap enough at expected unit counts (a handful of mobs per lane).
   - *Alternative considered*: sticky targeting (keep attacking the same target until it dies even if a closer one appears). Rejected — user explicitly asked for "immer den, der am nächsten ist" (always the closest one), implying continuous re-evaluation.

5. **HP/damage resolution happens in the same fixed-tick `update()` loop**, applying `damage * elapsedSeconds` (damage-per-second style) to the current target each tick, mirroring how movement already integrates `speed * elapsedSeconds`. Death/destruction is checked immediately after applying damage each tick.
   - *Alternative considered*: discrete attack "hits" on a cooldown timer per unit. Both are valid; DPS-style is chosen for simplicity and to avoid adding a new per-unit cooldown timer field for the first iteration. This can be revisited if discrete hit feedback (e.g., animations) is needed later.

6. **Towers extend `Entity` and gain their own `hp`/`maxHp`, and act as a valid attack target for mobs; whether towers themselves attack back is configurable via `CombatConfig.towerDamage` (0 disables tower counter-attacks) so the design stays extensible without committing to tower-vs-mob combat in this iteration** — the proposal only requires mobs to attack the tower, not the reverse.

7. **`Base` is superseded by `Tower`.** Rather than keeping both `Base` and a new `Tower` type, `Tower` replaces `Base` as the spawn point/destructible structure, since the proposal explicitly states "Main Tower" replaces the current base concept. `GameState.bases` becomes `GameState.towers`.

## Risks / Trade-offs

- **[Risk] Renaming `Base` → `Tower` and `GameState.bases` → `GameState.towers` breaks any existing client code referencing these fields.** → Mitigation: grep all usages in `frontend/` as part of implementation tasks and update them in the same change; this is called out as **BREAKING** in the proposal.
- **[Risk] Per-tick nearest-enemy scan is O(units²) across all mobs/towers/tanks.** → Mitigation: acceptable at current small unit counts (few mobs per lane × 3 lanes × 2 teams + 2 towers + few tanks); revisit with spatial partitioning only if profiling shows an issue.
- **[Risk] DPS-style continuous damage instead of discrete hits makes it harder to sync exact "hit" moments for future VFX/SFX.** → Mitigation: acceptable trade-off for this iteration; can add discrete-hit cooldown timers later without changing the public HP/targeting contract.
- **[Risk] Removing the old single-lane straight-to-base movement changes existing client visuals/tests that assume that behavior.** → Mitigation: covered by tasks to update any tests/rendering tied to `Minion.waypointX/Y` and `Base`.

## Migration Plan

1. Add `CombatConfig` constants (additive, no breakage).
2. Add `Tower` schema type; migrate `GameRoom.ts` to create `Tower` instances instead of `Base`, update `GameState` field name.
3. Extend `Minion` schema with `hp`, `maxHp`, `attackRange`, `damage`, `targetId`, `lane` fields; keep field additions backward-compatible where feasible.
4. Add lane waypoint definitions (top/mid/bottom) per team.
5. Replace `spawnWave`/movement logic in `update()` with per-lane spawning, targeting, combat, and resume-path logic.
6. Update any frontend code referencing `bases`/`Base` to `towers`/`Tower`.
7. No data persistence/migration needed — game state is ephemeral per match.

## Open Questions

- Should destroyed towers end the match immediately, or is that handled by a separate future change? (Assumed: out of scope here, tower `hp <= 0` just marks it destroyed/inactive.)
- Should Tanks (players) actively participate in this DPS-style combat loop identically to mobs, or only be valid *targets* for mobs/towers for now? (Assumed: only targets for now, per Non-Goals.)
