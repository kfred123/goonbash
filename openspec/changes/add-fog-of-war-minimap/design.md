# Design

## Context

See proposal.md for motivation and scope. The game uses a TypeScript shared workspace, an authoritative Colyseus backend with a 60 Hz simulation, and a Phaser frontend. The arena is 2400 by 1800 world units. Combat currently selects enemies by distance alone, and the client receives and renders all entities. Tanks have persistent click-selected target locks; ordinary shots and homing rockets already track living targets in flight.

The arena tilemap is a grass background. Streets are drawn over it from shared lane polylines, using a 112-unit stone stroke and a 124-unit decorative border with round caps and joins. Tile IDs alone therefore cannot identify gameplay grass. Bases and towers remain in state after destruction, while player tanks respawn. There is no existing minimap or vision model.

## Goals / Non-Goals

**Goals:**
- Use the same pure world-space visibility rules for server decisions, client concealment, fog, and minimap.
- Keep exact entity visibility independent of approximate visual fog sampling.
- Integrate with existing combat and scene lifecycle rather than introduce another simulation.

**Non-Goals:**
- Persistent explored-area memory, remembered enemy positions, minimap navigation, pings, and new obstacles.
- New neutral-mob spawning; existing mobs are minions.
- Server-side per-client state redaction or an anti-map-hack guarantee. Hidden entity data remains replicated; gameplay requests are nevertheless validated authoritatively.
- Changes to firing ranges, damage, cooldowns, projectile tracking, progression, or lane routing.

## Decisions

### 1. Explicit independent sight values

Add a replicated `sightRange` only to combat observer types, not to projectiles. Extend role defaults with absolute sight values and apply them when role stats initialize. Initial values are:

| Observer | Baseline fire range | Absolute sight range |
|---|---:|---:|
| Healer | 140 | 182 |
| Tank role | 130 | 169 |
| Damagedealer | 160 | 208 |
| Minion | 100 | 130 |
| Lane tower | 250 | 325 |
| Main base | 250 | 325 |

Keep any generic pre-role Tank schema default coherent with its current generic 150-unit fire range using an explicit 195-unit sight default; initialized gameplay tanks use their role value. Sight is not multiplied from fire range during simulation, respawn, level-ups, or ability changes. Later balancing can change the absolute defaults independently.

Alternative rejected: deriving sight from current firing range would contradict the requested independent absolute tuning and couple future combat buffs to reconnaissance.

### 2. One terrain definition shared with road drawing

Extract world dimensions, road widths, and the existing base anchors needed for lane geometry into shared arena definitions where appropriate. Classify the closed union of road strokes, including their decorative 124-unit outer width, as non-grass. Everything else inside the playable arena is grass. Use point-to-polyline distance with round endpoint/join semantics, matching the existing rendering rather than classifying by the underlying all-grass tilemap.

The border counts as road so a visible stone edge does not unexpectedly halve vision. A point exactly on the road edge counts as non-grass. Shared helpers must not import Phaser, browser APIs, or backend room code.

Alternative rejected: duplicating lane widths or classifying only tile IDs would make backend vision disagree with the visible roads.

### 3. Direct sightline cost and team union

For an observer, use its full absolute sight budget on road and half that budget when its center is in grass. Along the straight segment to a queried point, road distance costs 1 unit per world unit and grass distance costs 2. The point is visible when its accumulated cost is at most the budget, inclusive.

Compute road/grass segment lengths from the union of line-segment intersections with the round-capped road corridors. Merge overlapping intersection intervals before summing so road intersections do not count twice. Cache static road geometry. This avoids fixed-step aliasing and gives stable boundary behavior; no pathfinding or bending sight around grass is allowed.

Examples for a 200-unit sight range:
- On-road observer and entirely on-road ray: 200 world units visible.
- On-road observer with 80 road units followed by grass: 60 additional grass units visible.
- In-grass observer and entirely grass ray: 50 world units visible, because the starting budget is halved to 100 and grass costs twice as much.
- In-grass observer looking toward a road: start with 100 budget, then charge each terrain segment normally; do not apply another blanket multiplier based only on the target.

The user explicitly selected the additional observer penalty, so the all-grass result is a quarter of normal range, not a single half-range circle.

A team's visible area is the union of its living tanks, living minions, intact lane towers, and intact main bases. Test enemy centers against this union. Allied entities remain available to their team regardless of local fog, subject to existing alive/dead presentation. Destroyed structures emit no vision; enemy ruins are visible only while their position is currently revealed. Recompute from current positions, team membership, HP, and life state; no exploration history is retained.

Alternatives rejected: target-terrain-only multipliers do not account for intervening grass; flood-fill or shortest-path cost would allow sight to bend around grass; independent player-only circles conflict with the confirmed shared-team rule.

### 4. Server authority without changing replication scope

Build reusable team-visibility queries over current canonical room state. Refresh the observer snapshot before combat selection; invalidate/rebuild it when movement, spawning, death, respawn, removal, or team changes can affect later queries. Command and ability handlers must query current state, not a stale previous-tick cache.

Filter enemy candidates for all shooters by team visibility as well as existing life, team, and fire-range checks. A unit may fire using a teammate's sight, but never beyond its own firing range. Validate targeted commands and rocket activation on the server even if the client supplied a real hidden entity ID. Use existing invalid-action handling and add a focused rejection reason if the room lacks one; a rejected rocket does not consume cooldown.

Clear locked/current targets before pursuit or firing when they lose team visibility. Do not convert a lost lock to movement toward its hidden position or keep a last-known-position chase. Passive engagement can resume against other visible targets without creating pursuit. Minions continue their lane when no visible in-range target remains.

Once spawned, ordinary projectiles and rockets continue resolving against their living designated target regardless of later fog. Do not feed visibility into damage, homing, or XP attribution. Fog does not protect a previously acquired target from an in-flight shot.

Alternative rejected: client-only hiding would still let automatic targeting, guessed target IDs, and lock-follow movement reveal hidden enemies. Per-client Colyseus filtering is a separate replication project and is not necessary for the requested normal-client experience.

### 5. Visibility policy separate from presentation sampling

Introduce pure frontend presentation/projection helpers with tests; keep Phaser object orchestration in the scene. After state upserts and during scene updates, apply a single team visibility policy to the complete entity presentation: hull/outpost/ruin, cannon, name, health bar, role/ability decorations, muzzle flashes, target highlights, and attack markers. Hide the entire enemy group outside sight and restore it without replaying missed shot animations. Hidden targets must also be excluded from hit tests, rocket selection, and position-follow feedback.

Use the local player's team, not camera position. Until that team is known, do not show enemies. Death of the local player does not remove remaining allied team vision. Interpolation must not expose enemies already hidden at their latest authoritative position; only show an enemy when both its current canonical center and its rendered center pass visibility.

Render a reusable world-space fog texture from visibility samples, initially at 8-world-unit spacing, tinting unrevealed areas with a black overlay at alpha 0.6. The terrain remains recognizable; revealed areas have no fog tint. Fog does not create a new collision layer. Keep HUD and minimap outside the world mask. Rebuild at a bounded cadence synchronized with state updates, plus immediate concealment when visibility shrinks. A newly hidden enemy's presentation must disappear on that state update even if a terrain texture refresh is deferred.

Use exact visibility queries for entity/input decisions, never raster-cell membership. Fog contour error must stay within one sample-cell diagonal (about 11.4 world units at the initial spacing); increase sample density if necessary. Distant fog sampling need not run every render frame. Reuse graphics/textures and bounds-check queries before expensive sightline work.

Enemy projectile visuals are shown only where the projectile's current position is visible; allied projectiles remain visible. Rendered projectile paths, trails, and impact effects must not expose hidden enemy positions or private target-follow markers. This is a presentation rule only, not a change to projectile resolution.

Alternative rejected: a second camera simply rendering the world would duplicate labels/effects and expose hidden units; hard-coded circular cutouts would disagree with the selected grass model.

### 6. Read-only minimap

Add a top-right screen-space minimap with a 4:3 aspect ratio, initially 200 by 150 logical HUD pixels, scaled and repositioned by the existing viewport helpers. Fit the whole arena with consistent x/y world scaling. Draw simplified grass/roads, the same fog field, and small blue/red team dots for living tanks, minions, lane towers, and main bases. Distinguish the local tank with a small white outline, without changing team colors. Allied dots remain visible; hostile dots require exact team visibility. Dead units and tower ruins have no active dots.

Reserve the minimap rectangle for HUD input and stop pointer propagation into world movement, attack, and rocket selection. It remains informational: no camera or command interaction. It must not cover the bottom ability HUD or lobby title; scale down on small screens rather than overflow.

Destroy fog/minimap objects, listeners, and owned generated textures on arena teardown, menu return, room leave, and scene shutdown. Recreate cleanly for a subsequent match. During results, remove the arena HUD and keep the existing scoreboards unchanged.

## Risks / Trade-offs

- [Grass plus the observer penalty is severe, especially off-road spawns] -> Document the confirmed quarter-range all-grass behavior and cover road/grass transitions with numerical tests; retain independent absolute tuning for later balancing.
- [Many observers and fog samples can burden the render loop] -> Cache static road geometry, bound candidates by sight radius, reuse buffers, and profile both minion-heavy and normal scenes before fixing refresh cadence.
- [Full-state replication exposes hidden data to modified clients] -> State this limitation explicitly; enforce server-side gameplay eligibility and do not claim network confidentiality.
- [Fog sampling can disagree near an entity boundary] -> Exact entity queries are authoritative; enforce the contour-error bound and do not smooth enemy sprites into unrevealed regions.
- [Overlapping tower/main-base proposals] -> Reconcile current code and affected spec deltas before implementation; preserve existing fortress visuals and firing tuning.
- [Late tween or state-upsert callbacks can reshow hidden effects] -> Apply visibility after upserts and guard effect creation and callbacks with the same policy.

## Migration Plan

1. Implement shared terrain and sight definitions with numerical tests, then integrate backend and frontend consumers.
2. Extend existing test scripts to include new tests; verify full workspace builds and affected combat, progression, respawn, and scene lifecycle behavior.
3. Deploy shared, backend, and frontend together and start fresh rooms so every entity initializes its sight field. No persisted database migration is needed.
4. Roll back all three workspaces together if gameplay or performance regressions occur; do not mix old clients with new schema assumptions.
