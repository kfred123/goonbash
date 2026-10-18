# Spec Delta

## ADDED Requirements

### Requirement: Main Bases Fire at Nearby Enemies
During a started match, each living main base SHALL automatically fire at the nearest living enemy tank, minion, lane tower, or opposing main base within 250 world units. Each shot SHALL deal 24 damage, and the base SHALL fire no more often than once every 1,200 milliseconds. The backend SHALL replicate the shot and apply damage authoritatively; a base SHALL not fire when no valid enemy is in range.

#### Scenario: Enemy enters main-base range
- **WHEN** a living enemy enters a main base's 250-unit range during a started match and the base's cooldown has elapsed
- **THEN** the backend selects the nearest valid enemy and spawns a projectile from that base toward it
- **AND** the base begins a 1,200-millisecond firing cooldown

#### Scenario: Main-base projectile hits
- **WHEN** a main-base projectile reaches its designated enemy target
- **THEN** the backend applies 24 damage to that target and removes the projectile

#### Scenario: No valid enemy is in range
- **WHEN** a main base has no living enemy within 250 world units
- **THEN** the backend does not spawn a projectile for that base

#### Scenario: Main base is destroyed or the match has ended
- **WHEN** a main base has zero hit points or the match is not in the started phase
- **THEN** the backend does not allow that base to fire
