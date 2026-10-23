# Spec Delta

## ADDED Requirements

### Requirement: Grass Movement Speed Penalty
The backend SHALL reduce the movement speed of every mobile unit, including player tanks and minions, to 50% of its otherwise-applicable speed while it moves over grass. The backend SHALL apply the terrain penalty after role-specific base speed and any active movement ability modifiers have been applied. Units on stone terrain SHALL receive no terrain speed penalty.

#### Scenario: Player tank moves on grass
- **WHEN** a player tank moves while on a grass tile
- **THEN** the backend advances it at 50% of its role-specific speed, including any active movement modifiers

#### Scenario: Minion moves on grass
- **WHEN** a minion moves while on a grass tile
- **THEN** the backend advances it at 50% of its normal movement speed

#### Scenario: Unit moves on stone
- **WHEN** a mobile unit moves while on a stone tile
- **THEN** the backend applies no terrain speed penalty
