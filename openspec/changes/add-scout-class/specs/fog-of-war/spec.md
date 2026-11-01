# Spec Delta

## MODIFIED Requirements

### Requirement: Independent Absolute Sight Ranges
Player tanks in all roles (Healer, Tank, Damagedealer, and Scout), the generic Tank schema, lane towers, and main bases SHALL have a configured sight range of 390 world units. Minions SHALL have a configured sight range of 156. These SHALL be independent absolute base values, not runtime multipliers of firing range. A learned Scout sight ability MAY temporarily increase a Scout's effective sight range. The existing road/grass sight costs and observer-in-grass penalty SHALL apply unchanged.

#### Scenario: Role initializes
- **WHEN** a match initializes a player's role stats
- **THEN** the tank receives that role's configured base sight range

#### Scenario: Combat stats change
- **WHEN** progression or an ability changes a unit's combat stats without explicitly changing its sight range
- **THEN** its configured sight range remains unchanged

#### Scenario: Scout activates Weitsicht
- **WHEN** a Scout activates learned Weitsicht
- **THEN** its effective sight range increases according to the ability rank for the ability's active duration
- **AND** the increased sight contributes to the Scout team's current vision

#### Scenario: Weitsicht expires
- **WHEN** Weitsicht's active duration ends
- **THEN** the Scout's effective sight range returns to its configured base value
