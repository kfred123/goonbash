# Proposal

## Why

Minions are currently plain colored squares beside detailed comic tanks. The user selected the Nietenkaefer concept and explicitly requested moving legs while travelling.

## What Changes

- Render existing minions as compact four-legged mechanical beetles with a hexagonal team-colored hull, ivory visor, rivets and short cannon.
- Animate alternating diagonal leg pairs from actual rendered travel distance; stop the gait when stationary.
- Preserve combat, hit areas, health bars and lifecycle behavior.

## Capabilities

### New Capabilities

- `minion-visuals`: Beetle appearance, movement-driven walking and independent cannon aiming.

### Modified Capabilities

None.

## Impact

Frontend Phaser rendering, focused visual/motion tests and a backend-free browser preview. No backend, protocol, dependency or balance changes.
