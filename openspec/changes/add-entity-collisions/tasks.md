# Tasks

## 1. Collision geometry and movement primitives

- [x] 1.1 Add shared fixed world-space collision radii for players (24), minions (11), lane towers (24), and bases (48), initialize the existing entity radius field, and export the constants; verify shared state tests assert these values remain independent of visual scale and click/projectile radii.
- [x] 1.2 Add typed living-blocker selection for the collision matrix; verify table-driven tests cover both teams, self-exclusion, player/minion pass-through in both directions, dead players/previews, destroyed towers, and living main bases.
- [x] 1.3 Implement pure swept-circle movement with bounded contact/sliding resolution and radius-aware world boundaries; verify unit tests cover direct/tangent contact, zero displacement, starting at contact and moving away, multiple blockers, and corner contacts.
- [x] 1.4 Verify the movement helper prevents a large step from crossing an entire blocker, preserves separation within `1e-4` world units, and never exceeds the supplied path-distance budget; include explicit numeric assertions for each invariant.
- [x] 1.5 Document collision constants and numeric tolerance alongside their definitions, and add the team-independent collision matrix to `readme.md`; verify all supported entity pairs and non-blocking dead states are described.

## 2. Collision-safe spawning and activation

- [x] 2.1 Add bounded near-base placement searches reusing collision predicates and the existing 80-140-unit tank annulus; verify clear results satisfy world bounds, base clearance, and player separation while ignoring minions.
- [x] 2.2 Wire initial player placement, match-start revalidation after tower creation, and respawn activation through the placement helper; verify room tests cover occupied player spawn positions, retained clear preview positions, relocated occupied previews, and unchanged HP/progression/timing behavior.
- [x] 2.3 Place minion waves outside their living base with distinct lane-oriented clear positions, checking earlier placements in the same wave; verify tests cover all three lanes on both teams and a subsequent wave encountering older stationary minions.
- [x] 2.4 Implement explicit pending activation/spawn retries when no local space is available, retaining player or wave/lane identity and logging deferral once; verify saturation tests produce no overlapping live units or duplicate spawns and activate pending units after space clears.
- [x] 2.5 Clean pending placement state on player leave, match end, and disposal; verify lifecycle tests show no delayed activation after cancellation and no simulation activity after match end.
- [x] 2.6 Document safe wave placement, delayed activation under saturation, and the occupied-preview relocation exception in `readme.md`; verify the text preserves existing respawn preview visibility and countdown rules.

## 3. Player movement and attack pursuit

- [x] 3.1 Route move-to-point and locked-target pursuit through the shared movement resolver in stable ID order; verify room tests cover allied/enemy player blockers, both teams' towers and bases, and simultaneous opposing movement without side-swapping.
- [x] 3.2 Determine arrival from the resolved position and retain blocked destinations and valid target locks; verify temporary blockage resumes after clearance, actual arrival clears the move goal, and death/visibility loss still clears invalid locks.
- [x] 3.3 Preserve movement-speed calculations, terrain penalties, Entrench immobility, combat stop-in-range behavior, and passive fire; verify focused tests show no pushing of idle/entrenched tanks and no speed increase from sliding or active Healer Speed.
- [x] 3.4 Verify player/minion crossing remains passable, destroyed ruins and dead previews never block, and concealed authoritative blockers do not add hidden entity data to client state; extend room/visibility regression tests without changing projectile collision rules.
- [x] 3.5 Document player stop/slide behavior, retained blocked commands, and the absence of automatic player route planning in `readme.md`; verify it matches both movement-command and attack-pursuit behavior.

## 4. Minion avoidance and lane continuation

- [x] 4.1 Extract a minion movement phase preserving existing engagement and waypoint behavior, then apply collision-safe movement with stable unit ordering; verify tests retain stationary combat behavior, resume movement after target loss, and clamp actual steps at waypoints without overshoot.
- [x] 4.2 Add deterministic local detour selection with persistent obstacle-side state and swept validation of candidate steps; verify a minion passes an isolated allied lane tower, its own main base's edge, and a stationary minion without overlap or permanent stalling.
- [x] 4.3 Verify multi-tick crowd behavior with same-team followers and opposing waves, including full local blockage followed by clearance; assert separation every tick, stable detour direction, actual forward progress where free space exists, and unchanged waypoint order.
- [x] 4.4 Clear detour state when minions die and on room disposal, and handle disappearing/destroyed blockers; verify tests show immediate resumption around cleared obstacles and no stale state retained for removed minions.
- [x] 4.5 Document local avoidance, return to lane objectives, combat holding, and waiting when crowded in `readme.md`; verify no change is claimed to lane geometry, tower positions, or target priorities.

## 5. Cross-surface integration checks

- [x] 5.1 Run the focused new collision/movement/placement tests plus existing combat, ability, terrain, respawn, tower-placement, and vision regressions using the repository's `tsx --test` runner; verify all selected tests pass.
- [x] 5.2 Run the shared build/tests and frontend build, and type-check the backend using its existing TypeScript configuration; verify shared exports, entity radius initialization, and existing replication remain compatible without new dependencies.
- [x] 5.3 Exercise a two-client match with allied/enemy player contact, tower/base contact, player/minion crossing, minion detours, destroyed ruins, and a blocked respawn; verify the authoritative behavior is visible and tank interpolation does not produce sustained obstacle clipping.
- [x] 5.4 Run a representative multi-wave room simulation in both collection insertion orders; verify deterministic collision-safe results for fixed IDs/state, no duplicate pending activations, no stuck isolated-obstacle detours, and no unbounded per-tick search.
