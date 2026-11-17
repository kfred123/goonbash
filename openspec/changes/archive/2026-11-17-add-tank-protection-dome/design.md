# Design

## Context

See `proposal.md` for the motivation and `specs/` for the behavior contract. The game already keeps ability rank and timing independently per ability, validates activations on the backend, applies damage centrally, and projects synchronized state through per-client team-vision views. The Tank currently has two abilities; the HUD supports role-based ability slots.

## Goals / Non-Goals

**Goals:**

- Add a third independently learned Tank ability with authoritative placement, effect timing, and damage reduction.
- Keep the dome stationary and visible as a world-area effect to clients allowed to see its location.
- Protect allied tanks and minions in range without stacking damage reductions.

**Non-Goals:**

- Make the dome a movement obstacle or block projectiles, attacks, or line of sight.
- Protect towers or bases, heal units, or give units protection outside the dome's radius.
- Allow the dome to follow its Tank after placement.

## Decisions

1. **Register the dome as a normal Tank ability.** Add a stable ability ID and definition to the shared catalog and append it to the Tank's role ability list. Keep its level, cooldown, and activation timing in the existing per-ability state map. This reuses purchase validation and role-specific HUD progression instead of creating a separate activation path.

2. **Represent each placed dome as a transient replicated area entity.** The ability state alone cannot represent a fixed center after the Tank moves. Add a small synchronized world entity carrying owner/team, center, radius, cast-time damage reduction, and expiration time, and remove it when it expires. Keep the placed dome independent from its owner's later movement or death. Project allied domes to their team and enemy domes only while their center is visible, redacting the owner reference unless that Tank is visible, following the existing visibility-scoped state pattern. No persistent-data migration is needed because match state is in memory.
   - *Alternative*: Store center coordinates only on the Tank's ability state. This couples a world object to its caster, complicates visibility projection, and makes independent dome expiration/removal less clear.

3. **Apply the strongest applicable reduction once in the authoritative damage path.** For a damaged tank or minion, consider active dome reductions from same-team domes whose centers are within the configured radius. For Tanks, also consider the existing Shield and Entrench reductions. Apply the maximum value, not an additive or multiplicative combination, so overlapping domes and personal defenses cannot compound into extreme damage immunity. Structures remain unaffected.
   - *Alternative*: Stack all reductions. That would make overlapping team effects disproportionately powerful and inconsistent with the existing Shield/Entrench rule.

4. **Render the effect as a stationary translucent ground circle.** Derive its position, size, team tint, and active lifetime from the synchronized dome entity; do not predict or move it with the Tank. Let normal team-vision projection control visibility rather than drawing from hidden canonical state.

5. **Use the third role slot for activation.** Reuse the standard ability HUD progression and cooldown feedback. Assign the Tank's third ability to the existing third-slot key, R, in addition to its dedicated HUD activation control.

## Risks / Trade-offs

- [A large allied area reduction may swing team fights] → Keep the initial values explicit and test rank scaling; reductions use the maximum active percentage rather than stacking.
- [A dome can expire or become hidden while clients are processing state changes] → Make expiration and eligibility authoritative on the backend; render only replicated, currently visible domes.
- [Multiple Tanks may create overlapping domes] → Allow distinct placements, but use only the strongest active dome reduction for a target.
- [Client and server schemas must agree on the new world entity] → Deploy shared schema, backend, and frontend together; there is no persisted match data to migrate.

## Migration Plan

1. Add the ability definition, Tank role catalog entry, and replicated dome entity.
2. Add server activation, expiration, vision projection, and dome-aware damage reduction.
3. Add the third Tank HUD control and stationary dome rendering.
4. Add shared, backend, replication, and frontend tests for placement, boundaries, rank tuning, expiration, visibility, and non-stacking effects.
5. Roll back by reverting the coordinated release; no stored player or match data requires migration.
