# Proposal

## Why

The arena currently exposes every enemy, making scouting and terrain irrelevant to map awareness. A minimap and team-based fog of war will make allied units and towers provide useful reconnaissance while grass creates opportunities to remain hidden.

## What Changes

- Add a fixed-screen minimap showing the arena, allied units and towers, and currently visible enemy units and towers as small team-colored dots.
- Dim terrain outside the local team's current vision; conceal enemy entities and their attached presentation outside that vision on both the arena and minimap. Previously revealed areas become dark again when vision is lost.
- Give player tanks, minions, lane towers, and main bases explicit absolute sight-range values, initially about 30% greater than their baseline firing ranges, without a runtime dependency on firing range.
- Share vision from all living allied observers. Dead tanks and destroyed structures provide no vision.
- Make grass consume twice the sight budget per world unit along a direct sightline. An observer standing in grass additionally receives half its normal sight budget, producing terrain-dependent visibility contours rather than circles.
- Require team visibility for automatic target acquisition, player target locks, pursuit, and targeted ability activation. Clear locks on vision loss; preserve the behavior of already-fired projectiles.
- Preserve movement through dark terrain, existing damage and firing ranges, progression, respawn, and match results.

## Capabilities

### New Capabilities

- `fog-of-war`: Absolute observer ranges, shared team vision, grass-dependent sightlines, temporary revelation, and consistent concealment.
- `minimap`: Camera-independent arena overview with terrain, fog, and visibility-filtered entity dots.

### Modified Capabilities

- `unit-combat-targeting`: Restrict acquisition and new shots to team-visible enemies while preserving in-flight projectile resolution.
- `mouse-click-control`: Restrict attack selection and lock pursuit to visible enemies and clear tracking feedback on vision loss.
- `lane-towers`: Require shared team visibility for tower attacks without changing their existing combat tuning.
- `homing-rocket-ability`: Require visibility at target acquisition while preserving tracking after launch.
- `game-backend`: Authoritatively apply team visibility to commands, combat, and minion engagement.
- `game-frontend`: Apply visibility consistently to entity rendering, attached effects, health bars, input, and projectile presentation.

## Impact

- `shared`: New sight defaults and pure terrain/visibility helpers; sight fields on combat entity schemas and role defaults.
- `backend/src/rooms`: Vision queries integrated into command validation, targeting, locked movement, ability activation, and simulation lifecycle.
- `frontend/src/GameScene.ts`: Shared road/grass classification, fog presentation, visibility-aware visuals/input, minimap, and cleanup.
- Related shared, backend, and frontend tests and directly affected gameplay documentation require updates.
- No new external dependencies are planned. Existing full-state Colyseus replication remains in place; preventing modified clients from inspecting hidden replicated state is explicitly outside this change.
- Coordinate deployment of frontend, backend, and shared schema changes. Reconcile overlapping main-base/tower work in active changes before implementation.
