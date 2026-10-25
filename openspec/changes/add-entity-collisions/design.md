# Design

## Context

See `proposal.md` for motivation and the three delta specs for behavioral contracts.

`GameRoom.updateTankMovement` currently commits `stepToward` results directly after center-only world clamping. Minion movement is inline in `update`, skips engaged minions, and advances directly toward lane waypoints. No movement collision phase exists. `spawnWave` puts all three lane minions at the same base center. `nearBasePosition` randomizes a tank position without checking occupancy; respawns reactivate the position chosen at death.

`Entity.radius` exists but defaults to zero; only lane towers currently receive a movement-relevant candidate radius of 24. Render scale, click selection, and projectile impact thresholds have separate purposes. The client consumes authoritative positions and smooths tank presentation. Fog filtering belongs to replication, not to physical simulation.

The rebased implementation already includes preselected allied respawn previews. Preserve clear preview positions and explicitly allow relocation only when occupancy has made a position invalid; do not change preview visibility, countdowns, or respawn timing here. Lane towers are now placed in grass-side pairs rather than on lane centers; retain that placement while also supporting obstacle avoidance when a structure intersects a route.

## Goals / Non-Goals

**Goals:**

- Share one typed collision/placement implementation between player movement, minion steering, and activation.
- Make resolution deterministic for a given authoritative state and elapsed time.
- Keep server-only steering state separate from replicated gameplay state.

**Non-Goals:**

- Physics simulation, pushing, collision damage, projectile interception, or line-of-sight blocking.
- Player auto-pathfinding or a general navigation mesh.
- Changing role speeds, terrain penalties, ability behavior, firing range, visual scaling, or lane geometry.

## Decisions

### 1. Fixed world-space circles and an explicit matrix

Add shared collision constants with initial radii of 24 for players, 11 for minions, 24 for lane towers, and 48 for main bases, in world units. These describe body footprints, not barrels, legs, health bars, or shadows. Initialize the existing `Entity.radius` field for each kind so authoritative code and tests use one source; do not introduce another schema field. Constants do not derive from `WORLD_SCALE`, click radii, or projectile impact thresholds.

Use typed blocker selection: tanks consider living tanks and structures; minions consider living minions and structures. Exclude self, dead tanks, and structures with zero HP. Team is irrelevant. Never use the client's visibility-filtered state to select blockers.

Alternatives: a physics engine adds dependency and solver complexity without needed rigid-body behavior; deriving bounds from sprite dimensions couples gameplay to cosmetic changes; using click radii confuses selection affordances with physical space.

### 2. Resolve swept movement before committing positions

Add a pure backend collision helper that accepts position, displacement, radius, blockers, and world bounds. Sweep the moving circle against expanded blocker circles, find the earliest contact, and consume only the safe portion of the displacement. Remove the inward normal component of the remaining displacement to allow tangential sliding, then re-sweep against all blockers and world edges. Use a bounded number of contacts; stop safely when the budget is exhausted. Use a documented numeric tolerance of `1e-4` world units for separation assertions.

Shrink legal center bounds by the moving unit's radius. Do not clamp after resolution in a way that reintroduces overlap. Continuous sweeps prevent large-delta tunneling; displacement consumption prevents sliding from adding movement speed. Resolve units in stable ID order against authoritative positions updated by preceding units, including units that are not moving. This conservatively prevents simultaneous swaps without pushing stationary or entrenched players.

Use this helper for both player movement branches and every minion steering candidate. Determine move arrival from the committed position, not the unconstrained `stepToward.arrived`. A blocked destination and a valid target lock remain pending. Keep existing movement/ability gates, target validity, range checks, and terrain speed calculations before generating desired displacement.

Alternatives: endpoint-only tests allow tunneling; post-movement separation can push stationary tanks and violate speed limits; independent movement from a stale snapshot can allow two players to swap through one another.

### 3. Local minion detours with stable side selection

Extract minion movement from `update` into a testable phase. Keep shared lane paths unchanged and maintain lightweight, server-only detour state keyed by minion ID. For an unobstructed route use the existing waypoint direction. For a blocker, generate lateral/tangent detour candidates outside its expanded footprint and validate their swept steps against all blockers. Choose a side deterministically and retain it while clearing that obstacle to avoid alternating left/right every tick. Re-evaluate if that side becomes blocked; wait if no safe candidate remains.

Return to the original waypoint direction after clearing the obstacle, with waypoint advancement based on actual resolved position. The final enemy-base-center waypoint remains a strategic objective, not permission to enter a base: existing fire-range engagement stops the minion outside it. Engaged minions retain their position and act as obstacles to advancing minions. No separation force pushes combatants. Clear transient detour state on minion death and room disposal.

Alternatives: separation forces alone cannot guarantee non-overlap or reliable progress past a tower centered on the lane; stopping at every obstacle permanently stalls allied waves; a navigation mesh is unnecessary for the current sparse, circular structures.

Track attempted travel without a body-radius improvement toward the lane goal across obstacle changes and temporary direct steps. After eight body radii without progress, search a bounded local visibility graph around at most 32 nearby blockers: eight perimeter candidates plus the current position and goal. Collision-check every edge, retain the escape waypoints across ticks, and allow backing out of concave pockets. Return to direct movement as soon as the goal route clears. This handles clustered blockers without accepting tiny oscillating movements as successful avoidance or introducing global pathfinding.

### 4. Validate placement at every activation boundary

Reuse collision predicates for placement. For tanks, try randomized positions in the existing near-base 80-140-unit annulus, then a bounded deterministic candidate scan there. Recheck the preselected position when respawning and keep it if valid. If occupied, choose another clear local position before restoring alive state and HP. Dead previews are never physical reservations.

For minion waves, generate lane-oriented positions beyond the owning base's expanded radius, spaced from other active minions. Validate each accepted placement before inserting it, including the other minions accepted in the same wave. Preserve lane assignment and the original remaining path.

If the bounded search finds no position, retain an explicit pending activation/spawn record and retry on subsequent ticks; do not create a live overlapping unit, discard a scheduled unit, or spin indefinitely. Log entry into the deferred state once using the backend's existing logging convention, not once per tick. Cancel pending records on player leave, match end, or room disposal; a pending minion retains its wave and lane identity to avoid duplicate spawns. Revalidate existing lobby tank positions after lane towers are created and before starting active simulation.

Process at most 12 pending minions per retry pass and rotate blocked entries to the back of the queue so a saturated base cannot monopolize work or starve the other team's spawns.

Alternatives: movement-time correction cannot safely fix units born inside bases, especially while engaged; unchecked random retries can hang the loop; using a preview position without rechecking creates overlaps at respawn.

### 5. Retain authoritative replication and rendering boundaries

No new command or client-side collision prediction is needed. Replicate only the existing authorized state; do not send blocker details, avoidance paths, or collision-query results. Hidden blockers still affect physical movement without bypassing fog rules. Retain existing client interpolation unless focused visual verification demonstrates interpolation-induced clipping that needs a narrowly scoped correction.

## Risks / Trade-offs

- [Local steering can deadlock in fully occupied space] -> Waiting and retrying are defined behavior; stable detour sides and multi-tick tests must demonstrate progress around an isolated tower and stationary minion when room exists.
- [Spawn points are currently shared with base centers] -> Change wave placement together with collision activation, never enable one without the other.
- [Preview position can change on blocked respawn] -> Preserve valid positions and make occupied-position relocation an explicit exception to the existing respawn flow.
- [Pairwise checks grow with wave size] -> Start with simple bounded scans and early distance rejection; measure representative multi-wave simulation before adding a spatial index.
- [Circular bodies approximate square towers and elaborate sprites] -> Keep footprints explicit, visually inspect contact, and exclude decorative geometry rather than alter art or click bounds.
- [Stable sequential resolution favors some IDs in tight crowds] -> Accept conservative waiting without overlap; test both insertion orders and avoid depending on collection insertion order.
- [Hidden physical blockers can be inferred from a stopped unit] -> This is inherent to authoritative collision; never augment it with hidden identifiers, positions, or contact markers.

## Migration Plan

Deploy shared collision dimensions and the backend movement, steering, and placement changes together. No persisted-state migration or protocol change is required; existing rooms are ephemeral. Document the matrix and the occupied-preview exception. Roll back the feature commit as a unit so collision constraints and spawn placement cannot become inconsistent.
