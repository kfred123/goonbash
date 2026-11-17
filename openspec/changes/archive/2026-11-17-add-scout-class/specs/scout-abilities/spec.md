# Spec Delta

## Purpose

Defines the Scout's independently learned active abilities for reconnaissance, movement through grass, and temporary enemy movement control.

## ADDED Requirements

### Requirement: Scout Ability Availability
The system SHALL offer Weitsicht, Offroad-Geschwindigkeit, and Schockschuss as three independent abilities that only a Scout can learn and upgrade, each with its own rank from 0 through 10.

#### Scenario: Scout views available abilities
- **WHEN** a Scout opens the in-match ability HUD
- **THEN** the HUD lists Weitsicht, Offroad-Geschwindigkeit, and Schockschuss with their individual learned states and ranks

#### Scenario: Other role attempts to learn a Scout ability
- **WHEN** a player without the Scout role requests to learn or upgrade a Scout ability
- **THEN** the server rejects the request without changing skill points or ability ranks

### Requirement: Weitsicht Activation and Scaling
The system SHALL allow a Scout to activate learned Weitsicht while it is off cooldown, temporarily increasing that Scout's configured sight range. Both the additional sight range and the active duration SHALL increase with every ability rank.

#### Scenario: Scout activates Weitsicht
- **WHEN** a Scout activates learned Weitsicht while it is off cooldown
- **THEN** the Scout's sight range increases for the ability's active duration
- **AND** the increased sight contributes to the Scout team's current vision

#### Scenario: Weitsicht rank increases
- **WHEN** a Scout activates Weitsicht at a higher rank than before
- **THEN** its additional sight range and active duration are both greater than at the previous rank

#### Scenario: Weitsicht expires
- **WHEN** Weitsicht's active duration ends
- **THEN** the Scout's sight range returns to its configured value

### Requirement: Offroad-Geschwindigkeit Activation and Scaling
The system SHALL allow a Scout to activate learned Offroad-Geschwindigkeit while it is off cooldown, temporarily increasing the Scout's movement speed while traversing grass. The grass movement bonus SHALL increase with every ability rank and SHALL NOT increase movement speed on non-grass terrain.

#### Scenario: Scout moves through grass during Offroad-Geschwindigkeit
- **WHEN** a Scout traverses grass while Offroad-Geschwindigkeit is active
- **THEN** the Scout moves faster than its normal grass movement speed

#### Scenario: Offroad-Geschwindigkeit rank increases
- **WHEN** a Scout activates Offroad-Geschwindigkeit at a higher rank than before
- **THEN** its grass movement speed bonus is greater than at the previous rank

#### Scenario: Scout moves on non-grass terrain during Offroad-Geschwindigkeit
- **WHEN** a Scout traverses non-grass terrain while Offroad-Geschwindigkeit is active
- **THEN** the ability does not increase the Scout's movement speed on that terrain

#### Scenario: Offroad-Geschwindigkeit expires
- **WHEN** Offroad-Geschwindigkeit's active duration ends
- **THEN** the Scout's movement speed returns to its normal terrain-adjusted value

### Requirement: Schockschuss Projectile and Immobilization
The system SHALL allow a Scout to fire a Schockschuss projectile at a target while the ability is learned and off cooldown. On a hit, the projectile SHALL temporarily prevent the enemy target from moving without preventing it from firing, and the immobilization duration SHALL increase with every ability rank.

#### Scenario: Schockschuss hits an enemy
- **WHEN** a Schockschuss projectile hits an enemy
- **THEN** that enemy cannot move for the ability's rank-based duration
- **AND** that enemy can continue to fire

#### Scenario: Schockschuss rank increases
- **WHEN** Schockschuss hits an enemy at a higher rank than before
- **THEN** the enemy's immobilization duration is longer than at the previous rank

#### Scenario: Schockschuss misses its target
- **WHEN** a Schockschuss projectile does not hit an enemy
- **THEN** it does not immobilize an enemy

### Requirement: Scout Ability Activation Is Independent
The system SHALL track each Scout ability's active effect and cooldown independently, and SHALL NOT activate an unlearned ability or an ability that is on cooldown.

#### Scenario: Scout activates abilities independently
- **WHEN** a Scout activates one learned ability
- **THEN** the other Scout abilities' active effects and cooldowns remain unchanged

#### Scenario: Scout tries an unlearned or cooling-down ability
- **WHEN** a Scout activates an unlearned ability or an ability that is on cooldown
- **THEN** the system does not apply its effect or start another cooldown
