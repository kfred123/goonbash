# Proposal

## Why

The Damagedealer currently has sustained fire and a single-target Homing Rocket, but no ground-targeted siege ability. A heavy Mortar shell adds deliberate area denial and a strong answer to clustered enemies and defensive buildings without replacing either existing skill.

## What Changes

- Add `damagedealer-mortar` as a third independently learned and upgraded Damagedealer ability, following the existing level-0-to-10 skill-point model.
- Select a fixed ground point within 900 world units, including points in fog of war, rather than acquiring an enemy entity.
- Launch a visually oversized cannonball along an apparent arc; after a readable flight delay it explodes once, damaging living enemies in an area and dealing bonus damage to lane towers and main bases.
- Add a third HUD slot and an `R` shortcut, with a ground-area preview, cancellation, independent cooldown, and separate learn/upgrade control. Preserve `SPACE` for Rapid Fire and `E` for Homing Rocket.
- Replace the normal mouse pointer during weapon targeting: a clearly visible red crosshair for Homing Rocket and a bomb-shaped cursor for Mortar. Restore the normal pointer when selection ends.
- Resolve targeting, flight, area damage, and progression on the server. Blind fire must not reveal concealed enemies or grant sight.
- Proposed initial balance: 120-unit blast radius, 1.5-second flight, 24-second base cooldown, damage multiplier `2.0 + 0.2 * (ability level - 1)` on launch fire damage, and a further `3.0` multiplier against buildings.

## Capabilities

### New Capabilities

- `damagedealer-mortar-ability`: Ground-targeted shell launch, fixed-position delayed explosion, building bonus, rank scaling, authoritative validation, and fog-safe shell/impact presentation.

### Modified Capabilities

- `ability-hud`: Support a third Damagedealer slot, a cancellable Mortar area-selection flow, and distinct weapon-targeting cursors for Homing Rocket and Mortar.

## Impact

- Shared ability IDs, role ability lists, rank configuration, projectile schema, exports, and typed ability feedback.
- Backend ability activation, projectile updates, combat damage/death processing, match-end handling, and team-scoped serialization.
- Frontend ability controls, HUD construction and resize layout, keyboard bindings, world-space aiming, projectile visuals, and impact effects.
- Existing ability, progression, combat, visibility/replication, and frontend control tests; add focused Mortar coverage.
- No new runtime dependencies. Client and server must deploy together because synchronized projectile fields and activation payloads expand.
- Existing single-target acquisition visibility, ordinary attack/movement commands, role stats, and other roles' two-slot HUDs remain unchanged.
