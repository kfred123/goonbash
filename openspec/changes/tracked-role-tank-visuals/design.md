# Design

## Context

See proposal.md for motivation. Phaser currently uses a Healer container but primitive shapes for the other roles. Tanks already replicate combat target IDs and positions; a new protocol is unnecessary. Wrenches are drawn separately on the Healer and in the HUD/healing indicators.

## Goals / Non-Goals

**Goals:** Preserve the existing 40-unit world and 20-unit lobby footprint, camera roots, lifecycle and independent ability timings. Make tracks and cannon silhouettes readable at both sizes.

**Non-Goals:** No new skins, weapon types, hitboxes, attack rules or changes to projectile simulation.

## Decisions

- Use one container factory for all roles, with separate effects, chassis, turret and selection layers. This avoids role-specific lifecycle branches and prevents aiming from rotating the tracks or selection ring.
- Reproduce approved H1 (ivory tool turret and rear boxes), T2 (wide tracks and wedge armor), D1 (narrow chassis and long cannon) using vector primitives and dark outlines. Team paint remains on large surfaces; role accents never replace it.
- Chassis follows displacement; turret follows the replicated combat target using interpolated rendered positions when available. Keep the previous turret direction while idle. North-facing artwork requires an angle offset of pi/2.
- Reuse one wrench geometry in the turret, floating healing indicators and ability HUD. A concave open-jaw silhouette, solid metal handle and genuinely hollow ring end replace unrelated line glyphs. Strong outline and reduced highlights preserve small-size recognition.
- Keep existing independent healer aura/speed effects. Keep the player's white selection ring separate from defensive ability outlines so protection never hides ownership.
- Add drawing/angle unit tests and update the existing backend-free Phaser check page to exercise all roles, aiming, movement, effects, icons and cleanup.

## Risks / Trade-offs

- [Small artwork loses detail] -> Shared large silhouettes, fewer tread/highlight details at 20 units, inspect actual-size previews.
- [Long barrels overlap labels] -> Keep world models within the established body footprint and move name/health/healing labels above the longest barrel.
- [Aiming appears detached from targets] -> Update after positional interpolation, use rendered target centers and hold the last heading when a target disappears.
- [Visual changes accidentally affect combat] -> Frontend-only rendering; projectile origin and combat values stay unchanged.
