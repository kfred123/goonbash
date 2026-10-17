# Spec Delta

## MODIFIED Requirements

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player inputs, updates entity positions based on velocity and physics, and computes combat interactions, clamping all entity positions to the boundaries of the (expanded) game world.

#### Scenario: Processing movement
- **WHEN** the game loop ticks
- **THEN** the server applies all queued movement commands and computes the new absolute position of each tank, clamped within the current game world's boundaries

## ADDED Requirements

### Requirement: Player Movement Speed
The backend SHALL move each player's tank at half the movement speed previously used for its role, so that traversing the game world takes players proportionally longer.

#### Scenario: Tank moves toward a commanded destination
- **WHEN** a player's tank has an active move command or is chasing a locked target
- **THEN** the server advances the tank's position each tick using that role's halved movement speed value

#### Scenario: Role move speeds remain distinct
- **WHEN** tanks of different roles (healer, tank, damagedealer) are each moving toward a destination
- **THEN** each role continues to move at its own speed, all reduced to half of their prior baseline values, preserving relative role speed differences
