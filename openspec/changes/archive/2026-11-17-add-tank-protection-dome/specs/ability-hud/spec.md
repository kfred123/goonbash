# Spec Delta

## ADDED Requirements

### Requirement: Tank Protection Dome HUD Control
The system SHALL display Protection Dome as an independent third ability for the Tank, with its own learned state, level, active feedback, and cooldown, and SHALL allow activation through its dedicated HUD control or the R key.

#### Scenario: Tank sees the Protection Dome control
- **WHEN** the local player's role is Tank
- **THEN** the ability HUD displays Protection Dome separately from Shield and Entrench with its learned state and level

#### Scenario: Tank activates the dome from the HUD
- **WHEN** the Tank selects the Protection Dome HUD control while the ability is learned and off cooldown
- **THEN** the client sends an activation request for Protection Dome without activating Shield or Entrench

#### Scenario: Tank activates the dome with R
- **WHEN** the Tank presses R while Protection Dome is learned and off cooldown
- **THEN** the client sends an activation request for Protection Dome without activating Shield or Entrench

#### Scenario: Dome cooldown is shown independently
- **WHEN** Protection Dome is on cooldown while Shield or Entrench is ready
- **THEN** the HUD shows the dome's remaining cooldown without changing the other abilities' availability
