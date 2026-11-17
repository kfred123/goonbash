# Proposal

## Why

The game currently offers three roles, leaving room for a reconnaissance-focused playstyle that can reveal more of the battlefield, move through grass more effectively, and briefly disable an enemy's movement. Adding Scout as a fourth role gives teams a distinct mobility and control option that grows with player progression.

## What Changes

- Add Scout as a fourth selectable role, with role-specific base stats and Scout-only abilities.
- Add three independently learned and upgraded Scout abilities: temporary increased sight range (Weitsicht), temporary increased movement speed in grass (Offroad-Geschwindigkeit), and a projectile that temporarily prevents an enemy from moving while still allowing it to fire (Schockschuss).
- Scale Weitsicht's sight range and duration, Offroad-Geschwindigkeit's grass movement bonus, and Schockschuss's immobilization duration with ability rank.
- Keep ability activation, cooldown, duration, and progression server-authoritative and expose the Scout abilities through the existing progression HUD.

## Capabilities

### New Capabilities
- `scout-abilities`: Scout-only ability learning, activation, rank scaling, temporary effects, and combat interactions.

### Modified Capabilities
- `role-selection`: Add Scout to the available roles and define its role-specific spawn stats.
- `fog-of-war`: Support temporary, ability-driven sight-range increases for Scout and apply them to team vision.

## Impact

- Affects role selection, role-specific stat initialization, player progression and ability availability, server-side movement/combat/vision state, synchronized game state, and the in-match ability HUD.
- Adds no new external dependencies. Exact balance values for ability duration, range, movement bonus, projectile behavior, and cooldowns will be established in the design/specification.
