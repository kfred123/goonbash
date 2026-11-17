# Spec Delta

## Purpose

Defines the Healer's targeted burst-healing ability for quickly restoring one endangered allied player tank or minion, independently from the existing aura and movement skills.

## ADDED Requirements

### Requirement: Rescue Impulse Availability
The system SHALL offer Rescue Impulse only to Healers as an independently learned ability with a rank from 0 through 10.

#### Scenario: Healer views Rescue Impulse
- **WHEN** a Healer opens the in-match ability HUD
- **THEN** Rescue Impulse is shown as the third ability with its own learned state and rank

#### Scenario: Other role attempts to purchase Rescue Impulse
- **WHEN** a player who is not a Healer requests to learn or upgrade Rescue Impulse
- **THEN** the server rejects the request without changing skill points or ability ranks

### Requirement: Rescue Impulse Targeting and Healing
The system SHALL let a Healer activate learned Rescue Impulse on a living, visible allied player tank or minion within 250 world units, including the Healer themselves, healing that target immediately up to its current maximum health.

#### Scenario: Healer confirms a valid target
- **WHEN** a Healer confirms a living, visible allied player tank or minion within 250 world units
- **THEN** the target's health increases by the amount for Rescue Impulse's current rank, capped at its current maximum health

#### Scenario: Target is invalid
- **WHEN** the selected target is an enemy, dead, not visible, neither a player tank nor a minion, or farther than 250 world units
- **THEN** Rescue Impulse does not heal the target or begin its cooldown
- **AND** the server sends explicit rejection feedback without exposing hidden target information

#### Scenario: Healer selects themselves
- **WHEN** a living Healer activates learned, off-cooldown Rescue Impulse on themselves
- **THEN** the Healer receives the rank-based healing, capped at their current maximum health, and the ability starts its cooldown

### Requirement: Rescue Impulse Healing Scaling
Rescue Impulse SHALL heal 18 HP at rank 1 and 3 additional HP per rank above rank 1.

#### Scenario: Rank 1 healing
- **WHEN** Rescue Impulse is used at rank 1 on an eligible ally missing at least 18 HP
- **THEN** the ally recovers 18 HP

#### Scenario: Higher-rank healing
- **WHEN** Rescue Impulse is used at rank X from 1 through 10 on an eligible ally missing at least `18 + 3 * (X - 1)` HP
- **THEN** the ally recovers `18 + 3 * (X - 1)` HP

### Requirement: Rescue Impulse Cooldown
Rescue Impulse SHALL have a 20-second base cooldown, reduced by 3 percent per rank above rank 1 and never below 50 percent of its base cooldown.

#### Scenario: Successful use starts cooldown
- **WHEN** Rescue Impulse activates on an eligible target
- **THEN** its cooldown starts using the current rank's cooldown duration

#### Scenario: Target already has full health
- **WHEN** Rescue Impulse activates on an eligible target whose health is already at its maximum
- **THEN** the target's health stays at its maximum and the normal rank-based cooldown starts

#### Scenario: Use during cooldown
- **WHEN** the Healer attempts to use Rescue Impulse before its cooldown ends
- **THEN** no healing occurs and the cooldown is not restarted

#### Scenario: Other Healer abilities remain independent
- **WHEN** Rescue Impulse is learned, upgraded, or activated
- **THEN** Heal Aura and Speed retain their own rank, effect, and cooldown state
