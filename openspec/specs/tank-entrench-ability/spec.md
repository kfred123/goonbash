# tank-entrench-ability Specification

## Purpose

Defines the Tank's learned Entrench skill, which trades movement for strong temporary damage reduction and operates independently from the existing Shield.

## Requirements

### Requirement: Tank Entrench Activation
The system SHALL allow a Tank player to activate the learned Entrench ability when it is off cooldown. Entrench SHALL have its own level, active duration, and cooldown independent of Shield.

#### Scenario: Tank activates Entrench
- **WHEN** a Tank activates a learned Entrench ability that is off cooldown
- **THEN** the system prevents the Tank from moving, applies Entrench damage reduction, and starts Entrench's cooldown
- **AND** the Shield's level, active effect, and cooldown remain unchanged

#### Scenario: Unlearned or cooling-down Entrench is not activated
- **WHEN** a Tank attempts to activate an unlearned Entrench ability or one that is on cooldown
- **THEN** the system does not apply Entrench's effects

### Requirement: Entrench Prevents Movement
While Entrench is active, the Tank SHALL remain stationary and movement commands SHALL NOT move it. After Entrench expires, the Tank SHALL be able to move again.

#### Scenario: Tank receives a movement command while entrenched
- **WHEN** a Tank receives a move command while Entrench is active
- **THEN** the Tank's position does not change because of that command

#### Scenario: Entrench expires
- **WHEN** 4 seconds have elapsed since Entrench activation
- **THEN** movement is no longer restricted by Entrench

### Requirement: Entrench Reduces Incoming Damage
While Entrench is active, the Tank SHALL take 85 percent less incoming damage at ability level 1, increasing by 1 percentage point per additional level, up to 94 percent at level 10. If Entrench and Shield are active at the same time, the system SHALL apply only the greater of their damage-reduction percentages rather than stacking the reductions.

#### Scenario: Tank takes damage while Entrench is active
- **WHEN** the Tank takes damage while Entrench is active
- **THEN** the applied damage is reduced by the percentage for Entrench's current learned level before being subtracted from health

#### Scenario: Tank has both defensive abilities active
- **WHEN** Entrench and Shield are both active as the Tank takes damage
- **THEN** the system applies the greater active damage-reduction percentage once

#### Scenario: Entrench has expired
- **WHEN** Entrench has expired and Shield is not active
- **AND** the Tank takes damage
- **THEN** the full, unreduced damage is applied

### Requirement: Entrench Cooldown
Entrench SHALL have a base cooldown of 24 seconds. Its cooldown SHALL reduce by 3 percent per ability rank above level 1 and never below 50 percent of its base cooldown.

#### Scenario: Reactivation during cooldown
- **WHEN** a Tank attempts to activate Entrench before its cooldown ends
- **THEN** Entrench does not activate

#### Scenario: Entrench cooldown is independent of Shield
- **WHEN** Entrench is activated or its cooldown changes
- **THEN** Shield's cooldown and activation availability are unchanged
