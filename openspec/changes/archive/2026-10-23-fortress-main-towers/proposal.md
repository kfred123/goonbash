# Proposal

## Why

The two main bases currently look like simple colored squares, so they do not read as the important fortresses they represent. Giving them a recognizable keep silhouette and an actively firing cannon will make the main objectives clearer and make their defensive role visible during combat.

## What Changes

- Render each main base as a large team-colored, crenellated keep with a prominent central cannon turret.
- Rotate the cannon toward the main base's current enemy target and visibly fire when its shot is launched.
- Make each main base automatically attack the nearest valid enemy in its 250-unit firing range, dealing 24 damage every 1.2 seconds.

## Capabilities

### New Capabilities

### Modified Capabilities

- `game-frontend`: Main bases render as fortress keeps with a rotating cannon that visibly tracks and fires at its target.
- `unit-combat-targeting`: Main bases join automatic targeting as combat-capable shooters, using the agreed range, damage, and cooldown.
- `game-backend`: The authoritative game loop processes main-base firing and replicated projectiles while preserving existing base-destruction match-ending behavior.

## Impact

- Affected systems: `shared` base state, backend combat targeting and projectile simulation, and frontend base rendering.
- No external APIs or dependencies change.
