# Design

## Context

See `proposal.md` for the user-facing motivation and behavior. The game already registers role-specific abilities centrally, stores an independent ability state per ability, validates activation on the server, and builds HUD slots from each role's ability list. Homing Rocket provides an existing pattern for selecting a target before sending an activation request; Heal Aura provides the existing server-side ally-healing pattern.

## Goals / Non-Goals

**Goals:**

- Add a third Healer ability without changing Heal Aura or Speed behavior.
- Keep target validation, healing, and cooldown authoritative on the backend.
- Reuse role-driven HUD slot creation and the existing target-selection lifecycle where practical.

**Non-Goals:**

- Heal minions, towers, bases, enemies, or hidden allies.
- Add healing over time, area healing, or a revive effect.
- Change general skill-point progression or cooldown scaling.

## Decisions

- **Register Rescue Impulse as a normal role ability.** Add it to the shared ability definitions and append it to the Healer's ordered ability list. This preserves independent ranks, purchase validation, HUD progression, and the existing SPACE/E/R mapping; the third slot uses R.
- **Select one allied player tank before activation.** Reuse the frontend's targeted-weapon selection flow, adding a Rescue Impulse selection mode and a clear ally-target prompt. Escape, right-click, or selecting the same ability again cancels; invalid clicks retain selection and do not issue movement or attack commands. A direct activation request carries the selected tank's ID.
- **Validate and apply the heal in one server-authoritative step.** Require a started match, a living Healer, learned and off-cooldown ability state, and a living allied player tank visible to the Healer's team within 250 world units. The caster is also an eligible target. Reject invalid requests with explicit client feedback before changing health or cooldown. On success, add `18 + 3 * (rank - 1)` HP, capped at the target's current maximum HP, then start the normal rank-scaled 20-second cooldown even if the target already has full HP.
- **Keep the new effect instantaneous.** Do not create a timed effect state or modify aura resolution; the existing target tank HP and normal state replication carry the result.

## Risks / Trade-offs

- [The Healer can select an ally who becomes invalid before the click reaches the server] → Revalidate team, life state, visibility, and distance at activation time; do not trust client-side filtering.
- [A target click could also trigger normal arena controls] → Treat target selection as an exclusive input mode and test that confirmation, invalid clicks, and cancellation never leak movement or attack commands.
- [Burst healing may dominate ongoing aura healing at high ranks] → Keep the proposed rank-1 heal and linear scaling explicit in shared tuning and tests so later balance changes remain measurable.
