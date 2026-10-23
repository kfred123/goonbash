# Proposal

## Why

When a player tank has no enemy in its attack focus, its cannon can remain pointed at an obsolete target. Returning the cannon to the tank's facing direction makes its idle orientation consistent with the tank's current stance.

## What Changes

- Make the player tank's cannon return to the tank's facing direction whenever it has no valid unit in attack focus.
- Keep the cannon aimed at its current target while a valid unit is in attack focus.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-frontend`: Define cannon orientation for player tanks with and without a unit in attack focus.

## Impact

- Affects player tank cannon presentation in the game frontend; no backend, network API, or dependency changes are expected.
