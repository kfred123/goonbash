# Spec Delta

## Purpose

Defines how the Tank deploys a temporary lane barricade to restrict unit movement, and how opposing units can attack and destroy it.

## ADDED Requirements

### Requirement: Tank Barricade Placement
The system SHALL allow a Tank with the learned Barricade ability off cooldown to select a nearby valid road point and deploy a barricade perpendicular to the local lane direction.

#### Scenario: Tank places a barricade on a lane
- **WHEN** the Tank selects a road point within the ability's short placement range
- **THEN** the system places a barricade centered at that point and aligned across the road
- **AND** the ability cooldown begins when placement succeeds

#### Scenario: Tank selects an invalid placement point
- **WHEN** the selected point is outside the placement range or not on a road
- **THEN** the system does not place a barricade or start the cooldown

#### Scenario: Barricade ability is unlearned or cooling down
- **WHEN** the Tank attempts to place a barricade without learning the ability or before its cooldown ends
- **THEN** the system does not place a barricade

### Requirement: Barricade Blocks Unit Movement
A deployed barricade SHALL block movement by all Tanks and Minions, regardless of team, while allowing shots and projectiles to pass through.

#### Scenario: Tank or Minion reaches the barricade
- **WHEN** any Tank or Minion attempts to move through a deployed barricade
- **THEN** the unit cannot cross the barricade

#### Scenario: Unit moves alongside a barricade
- **WHEN** a Tank or Minion moves around an unblocked end of the barricade
- **THEN** the unit can continue moving without crossing the barricade

#### Scenario: Shot or projectile crosses the barricade
- **WHEN** a unit fires or a projectile travels across a deployed barricade
- **THEN** the barricade does not block the shot or projectile

### Requirement: Barricade Can Be Destroyed
A deployed barricade SHALL have its own health and be a valid target for opposing units' normal attacks.

#### Scenario: Opposing unit attacks a barricade
- **WHEN** an opposing unit selects a visible barricade as its normal-attack target
- **THEN** its attacks reduce the barricade's health

#### Scenario: Barricade health reaches zero
- **WHEN** damage reduces a barricade's health to zero or below
- **THEN** the barricade is removed and no longer blocks unit movement

#### Scenario: Allied unit attempts to attack a barricade
- **WHEN** a unit selects a barricade placed by its own team as an attack target
- **THEN** the system rejects the friendly target

### Requirement: Barricade Lifetime and Cooldown
A successfully placed barricade SHALL expire after 60 seconds, and its ability SHALL have a 90-second base cooldown that is not shortened if the barricade is destroyed early.

#### Scenario: Barricade expires
- **WHEN** 60 seconds have elapsed since placement
- **THEN** the barricade is removed and no longer blocks unit movement

#### Scenario: Barricade is destroyed before expiration
- **WHEN** opposing attacks destroy the barricade before its 60-second lifetime ends
- **THEN** the barricade is removed while the ability cooldown continues from the original placement time

#### Scenario: Cooldown remains longer than barricade lifetime
- **WHEN** the barricade is placed at any learned ability rank
- **THEN** the ability cooldown remains longer than its 60-second lifetime
