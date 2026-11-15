# Proposal

## Why

The Tank already has personal defensive abilities, but lacks a way to protect nearby teammates. A placed protective dome would let the Tank anchor a team position and reduce incoming damage for allied tanks and minions inside its area.

## What Changes

- Add a third independently learnable Tank ability that places a stationary protection dome at the Tank's position.
- Reduce incoming damage to the Tank and living allied tanks and minions inside the dome for its active duration.
- Give the ability its own cooldown and show its learned, active, and cooldown states in the ability HUD.

## Capabilities

### New Capabilities
- `tank-protection-dome-ability`: Defines placement, duration, area, damage reduction, eligible allies, and cooldown behavior for the Tank's protection dome.

### Modified Capabilities
- `ability-hud`: Include the Tank's third ability in the role HUD and activation controls.

## Impact

- Shared ability definitions and the Tank role's ability catalog.
- Backend ability activation, authoritative damage application, active dome state, and replication.
- Frontend Tank ability controls and dome visualization.
- Shared, backend, and frontend tests for ability progression, targeting/area behavior, damage reduction, expiration, and HUD feedback.
