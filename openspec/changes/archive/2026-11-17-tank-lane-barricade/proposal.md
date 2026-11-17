# Proposal

## Why

The Tank's Entrench ability is a short personal defensive effect that stops its movement, but it does not help the Tank control a lane for its team. Replacing it with a deployable, destructible road barrier gives the Tank a way to hold a temporary front line after advancing under its armor.

## What Changes

- Replace the Tank's Entrench ability with a learned lane-barricade ability; keep the Tank's existing ability slots and leave Shield and Protection Dome unchanged.
- Let the Tank select a nearby ground placement point; place the barricade across the local lane, with a 60-second lifetime and 90-second base cooldown beginning on placement.
- Block movement for all tanks and minions, including allies, but do not block shots or projectiles.
- Give the barricade health so opposing units can target it with normal attacks and destroy it early; destruction does not reset or shorten the ability cooldown.
- Show placement targeting and feedback through the existing ability HUD and click controls.

## Capabilities

### New Capabilities

- `tank-lane-barricade-ability`: Defines barricade placement, lane alignment, movement blocking, lifetime, cooldown, and destruction.

### Modified Capabilities

- `tank-entrench-ability`: Remove Entrench behavior because the ability is replaced.
- `unit-combat-targeting`: Include enemy barricades as valid normal-attack targets.
- `ability-hud`: Add the barricade ability's placement-targeting interaction to Tank ability activation.
- `mouse-click-control`: Ensure a placement click is handled as an ability target rather than a move or attack command.

## Impact

- Shared ability catalog, role progression, replicated match state, and movement/collision handling.
- Backend ability activation, placement validation, obstacle collision, target acquisition, projectile damage, and expiration.
- Frontend Tank ability icon, ground-targeting mode, and barricade rendering.
- Shared, backend, and frontend tests for placement range, lane alignment, blocking, targeting, destruction, expiration, cooldown, and HUD behavior.
