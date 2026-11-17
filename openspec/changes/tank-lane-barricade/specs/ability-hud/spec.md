# Spec Delta

## ADDED Requirements

### Requirement: Barricade Placement Targeting
Activating the Tank's learned Barricade ability SHALL enter ground-placement targeting mode rather than immediately placing a barricade.

#### Scenario: Tank selects Barricade
- **WHEN** a Tank activates its learned, off-cooldown Barricade ability through the HUD or its assigned ability key
- **THEN** the client enters barricade-placement mode without starting the cooldown

#### Scenario: Tank selects a placement point
- **WHEN** barricade-placement mode is active and the Tank clicks a ground point
- **THEN** the client sends the Barricade activation request with that point
- **AND** the click does not issue a move or ordinary attack command

#### Scenario: Tank cancels placement
- **WHEN** the Tank cancels barricade-placement mode before selecting a point
- **THEN** the client leaves placement mode without placing a barricade or changing the ability cooldown

#### Scenario: Tank ability slot remains stable
- **WHEN** the Tank's role abilities are displayed or activated by assigned keys
- **THEN** Barricade occupies Entrench's former ability slot and activation control
- **AND** Shield and Protection Dome remain available in their existing slots
