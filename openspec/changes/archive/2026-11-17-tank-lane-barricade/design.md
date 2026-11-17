# Design

## Context

See `proposal.md` for the motivation and `specs/` for the behavior contract. The Tank currently has three independently learned abilities, with Entrench in the second slot. Ability activation and cooldown are authoritative on the backend, lane paths are shared, mobile-unit movement uses a continuous circle-collision solver, and normal attacks target replicated entities through a shared combat path.

## Goals / Non-Goals

**Goals:**

- Represent a barricade as a short-lived, replicated match entity with an unambiguous lane-relative orientation.
- Make the barricade a movement obstacle for both Tanks and Minions without making it projectile cover.
- Reuse normal attack targeting and damage behavior so opposing units can deliberately remove it.
- Keep Tank ability progression and slot layout stable while replacing Entrench.

**Non-Goals:**

- Add a fourth Tank ability or change Shield and Protection Dome.
- Block line of sight, shots, or projectiles.
- Let units pass through the barricade based on team.
- Make the barricade persistent beyond the current match.

## Decisions

1. **Represent each barricade as a replicated world entity.** Store its owner/team, center, lane-relative angle, length, health, and expiration time independently from the owner's Tank. This lets it remain in place if its owner moves or dies and gives combat, visibility, and rendering one shared source of truth. Remove it from match state immediately on expiration or destruction.
   - *Alternative*: Store placement data on the Tank's ability state. That couples obstacle lifetime and visibility to its owner and makes normal attack targeting less direct.

2. **Derive orientation and length from the shared lane geometry.** Find the nearest lane segment at the requested point, orient the barricade perpendicular to that segment, and use the rendered road width (about 155 world units) for its span. Start with a short placement radius of 180 world units, then tune it with playtesting. Reject placement outside the radius, off-road, or overlapping a structure or another barricade; failed placement must not start cooldown.
   - *Alternative*: Let the player rotate or choose barricade length. That adds controls and permits placements that do not seal the road.

3. **Extend movement collision with a finite oriented obstacle.** The current movement blockers are circular bodies. Add a segment/capsule-style obstacle check to the existing swept movement resolution so Tanks and Minions cannot cross the barricade, while they can move around its ends. Do not feed barricades into projectile path resolution.
   - *Alternative*: Approximate the barricade with a large circle. That would block too much space around its ends and would not reliably seal a road-width crossing.

4. **Integrate barricades into existing enemy target selection and damage.** Include living enemy barricades in the combat target union and in both player-locked and automatic target selection. Use the existing team-visibility rules for enemy acquisition and existing normal-attack damage; allied barricades remain invalid targets. A projectile only damages its designated barricade target, never a barricade it passes on the way to another target.
   - *Alternative*: Add a special “attack barricade” command or a separate damage message. That duplicates target and damage validation already used by normal attacks.

5. **Replace Entrench in place and preserve shared rank behavior.** Register Barricade in Entrench's ability slot, remove Entrench's movement lock and damage reduction, and keep Shield and Protection Dome unchanged. Start with a 90-second base cooldown and 60-second lifetime; existing 3-percent-per-rank cooldown reduction leaves the cooldown longer than the lifetime through the current maximum rank. Cooldown begins only after valid placement and continues if the barricade is destroyed early.
   - *Alternative*: Start cooldown when the barricade is destroyed. That makes cooldown timing depend on enemy damage and can reward early destruction with a much faster recast.

6. **Keep the placement interaction in the existing ability flow.** Selecting Barricade enters ground-targeting mode; clicking sends the requested point, while canceling or clicking an invalid point does not spend the cooldown. The server independently validates role, learned state, cooldown, match state, range, road placement, and overlap.
   - *Alternative*: Place automatically in front of the Tank. That removes placement precision and makes lane alignment less reliable near turns.

## Risks / Trade-offs

- [The barricade blocks allied traffic as well as enemy movement] → Make the all-team collision rule visible in placement feedback and verify Minion pathing around the ends.
- [A long lifetime could stall a lane or decide a fight] → Start with a 60-second lifetime, a longer cooldown, and a destructible health pool; tune health in playtesting.
- [Collision behavior could differ between Tanks and Minions] → Exercise the same obstacle boundaries and both unit types in backend movement tests.
- [Fog-of-war projection could make an enemy barricade impossible to target] → Project allied barricades to their team and enemy barricades only while their location is visible, following existing world-entity visibility rules.

## Migration Plan

1. Replace the Tank's Entrench ability definition with Barricade while retaining the existing role slot and progression model.
2. Add the replicated barricade entity and authoritative placement, expiration, and destruction handling.
3. Add oriented barricade collision to Tank and Minion movement and include barricades in normal attack targeting.
4. Add client placement targeting, click handling, visibility-aware rendering, and HUD presentation.
5. Validate placement boundaries, collision, targeting, lifetime, rank-scaled cooldown, and destruction across shared, backend, and frontend tests.
6. Roll back by reverting the coordinated client/backend/shared release; match entities are in-memory and require no persistent-data migration.

## Initial Tuning

- Start barricades at 150 HP, independent of ability rank. Revisit this value through playtesting against Tank and Minion attack rates.
