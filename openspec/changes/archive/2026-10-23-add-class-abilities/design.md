# Design

## Context

See `proposal.md` for the motivation and `specs/` for the behavioral contract. The current implementation stores one `abilityLevel`, one cooldown, and one active-until timestamp on each `Tank`, then dispatches activation by role. The HUD similarly has one slot. The backend already owns combat and ability timing, while the Phaser client uses click-to-move/attack and synced target identifiers.

## Goals / Non-Goals

**Goals:**
- Keep all six role abilities independently learnable, upgradeable, activatable, and synchronized.
- Preserve existing ability behavior and progression while making new effects authoritative on the backend.
- Reuse existing entity targeting and replicated projectile state for the rocket where possible.
- Make rocket target selection unambiguous and prevent selection clicks from triggering regular movement or attacks.

**Non-Goals:**
- Add abilities beyond the two available to each existing role.
- Add target auto-selection, multi-target rockets, destructible rockets, or a new general targeting system.
- Change experience rewards, skill-point awards, or role base combat stats.

## Decisions

1. **Represent ability state by stable ability ID.** Add a shared `AbilityId` union and a role-to-ability catalog for `healer-aura`, `healer-speed`, `tank-shield`, `tank-entrench`, `damagedealer-rapidfire`, and `damagedealer-homing-rocket`. Each tank will synchronize a `MapSchema` keyed by these IDs; each entry contains its own level, cooldown end/max, and active-until timestamps. Initialize all supported IDs at level 0 so locked state is explicit. The server will accept only IDs in the player's role catalog. This replaces the single-slot state rather than keeping two competing sources of truth.
   - *Alternative*: Add a separate set of fields for each ability. A map keeps purchase, HUD, and activation flows uniform and makes future additional abilities additive.

2. **Make purchase and activation messages identify an ability.** Upgrade requests will carry `abilityId`; activation requests will carry `abilityId` and, only for the Homing Rocket, `targetId`. The backend will validate role ownership, level, skill points, cooldown, and target from authoritative room state. Activation will never spend points. Invalid requests leave ability state and skill points unchanged. All current frontend call sites will send explicit IDs; legacy ID-less requests will not be guessed or silently mapped.
   - *Alternative*: Keep one activation message per role or infer the ability from the role. That cannot distinguish two abilities of the same role.

3. **Keep the HUD role-specific with two independent controls.** Show both abilities for the local player's role, each with its own locked/level/active/cooldown feedback and separate learn/upgrade action. Preserve `Space` for the first (existing) ability and use `E` for the second; each HUD control remains clickable. Selecting Homing Rocket enters a client-side target-selection mode. A valid enemy click sends the target-specific activation request instead of the normal `command`; Escape, right-click, or selecting the rocket control again cancels selection. Invalid clicks do not fire and do not leave target mode. The server remains authoritative even if a stale client enters the mode while locked or cooling down.
   - *Alternative*: Use one HUD slot with a cycle button. Separate controls make both cooldowns and learning state visible at once.

4. **Reuse the existing entity-target model for Homing Rocket.** Reuse the room's lookup for living tanks, minions, towers, and bases, and its replicated projectile collection. On launch, snapshot the rocket damage from the shooter's current progression-adjusted fire damage and ability level. The server steers the rocket toward the same target's current position at 450 world units/second, applies damage once on impact, and removes it without damage if that target dies first. Enforce the 900-unit firing range only at launch; movement after launch does not break lock. Start the 20-second base cooldown only after a valid launch. This avoids trusting client-computed damage, aim, or target positions.
   - *Alternative*: Auto-lock the nearest enemy in the aim direction, as described by the legacy spec. That conflicts with the requested explicit target choice and is less predictable with the current click-to-command controls.

5. **Apply temporary movement and damage effects in the authoritative room tick.** Healer Speed modifies the effective movement speed only while active (level 1 multiplier 1.15, +0.05 per rank through 1.60, 4-second duration, 18-second base cooldown). Tank Entrench blocks movement commands while active (4 seconds, 24-second base cooldown) and reduces damage by 85% at level 1, +1 percentage point per rank through 94%. If Shield and Entrench overlap, apply only the greater active reduction. Each ability uses the existing cooldown progression: reduce its base cooldown by 3% per rank above level 1, with a 50% floor. Preserve the existing Heal Aura, Shield, and Rapid Fire tuning.
   - *Alternative*: Stack Tank reductions multiplicatively or additively. Either makes simultaneous activation disproportionately strong; taking the greater value is predictable and avoids a near-invulnerability combination.

6. **Treat this as a coordinated client/server schema update.** Rooms are in-memory and do not persist tank state, so no stored-data migration is required. Update the shared schema, backend, and frontend together; new clients and servers must use the ability map and explicit message payloads. Remove or stop reading the legacy single-slot fields once all consumers are migrated.
   - *Alternative*: Preserve old ID-less requests and infer the first ability. This risks activating a different ability than the player's intent and would hide stale callers.

## Risks / Trade-offs

- **The six-entry state map and multiple HUD controls enlarge synchronized state and UI surface** → Keep entries to the four numeric state values, display only the two abilities for the selected role, and test role changes in the waiting lobby before progression begins.
- **Rocket target state may become invalid between client selection and server handling** → Revalidate target ID, team, living state, type, and range atomically at launch; reject without cooldown or projectile.
- **A rocket can be launched at long range and pursue a moving target** → Bound launch range to 900 world units and travel speed to 450 units/second; remove the projectile if its target is destroyed.
- **Independent timers can drift if the frontend predicts effects** → Keep server timestamps authoritative and use replicated per-ability timing only for HUD feedback.
- **Schema and message changes require matching client and server versions** → Deploy the shared state and both applications as one compatible release; there is no persistent match state to migrate.

## Migration Plan

1. Add shared ability IDs/catalog and per-ability synchronized state, initially locked.
2. Update backend purchases, activations, timed effects, defensive reduction, and the homing projectile path to use ability IDs.
3. Update the HUD and input handling to display both role abilities, send explicit IDs, and isolate rocket target clicks.
4. Update existing ability/progression tests and add focused tests for independent levels/cooldowns, effect expiration, invalid rocket targets, tracking, and non-stacking damage reduction.
5. Roll back by reverting the coordinated release. No persistent player data migration is required.
