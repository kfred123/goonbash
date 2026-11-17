# Proposal

## Why

Roads, towers, players, and mobs should be more prominent, while the grass between lanes should occupy less space. Their dimensions are currently distributed across shared geometry and frontend drawing code, making later size adjustments unnecessarily error-prone.

## What Changes

- Increase road width, including its surrounding border, by 20% relative to the current dimensions; this is not a camera zoom or an increase in lane length.
- Increase the linear visual dimensions of arena players, mobs/minions, lane towers, tower ruins, and main-base towers by 20%, preserving their relative proportions.
- Reduce the clear grass gap between adjacent parallel lane sections by 10%, measured between the outer road borders, accounting for the wider roads.
- Centralize named scale factors and unscaled baseline dimensions so later adjustments require changing configuration rather than scattered drawing constants.
- Keep rendered streets, server waypoints, tower placement, minimap terrain, and terrain-dependent vision aligned with the same derived geometry.
- Adapt selection areas, labels, health-bar offsets, and structure muzzle positions to the larger presentation without changing combat balance, arena bounds, or screen-space UI scale.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tilemap-rendering`: Configurable road width and clear grass spacing, derived from shared lane geometry.
- `game-frontend`: Configurable arena entity presentation sizes and aligned interaction and combat feedback.

## Impact

- Shared geometry and configuration in `shared/src/lanes.ts`, `shared/src/arena.ts`, the shared exports, and structure cannon geometry.
- Arena presentation and selection in `frontend/src/GameScene.ts`, `roleTank.ts`, `minionBeetle.ts`, structure feedback helpers, and their tests.
- Backend lane traversal, path-relative tower placement, and structure projectile origins consuming shared geometry.
- Existing lane, vision, cannon, visual, and backend regression tests plus directly related documentation.
- No new dependencies, network schema changes, settings UI, runtime slider, or changes to damage, health, cooldowns, movement speed, collision/hit radii, or ability/vision ranges.
