# Spec Delta

## ADDED Requirements

### Requirement: Display Player Names Above Tanks
The frontend SHALL render each player's actual display name in a label above their tank at all times the tank is alive and visible, including above the local player's own tank. The local player's own tank label SHALL be visually distinguishable from other players' labels (for example, via an indicator appended to the name) without replacing the name itself with a generic placeholder.

#### Scenario: Viewing another player's tank
- **WHEN** another player's tank is visible in the arena
- **THEN** the frontend shows that player's actual name in the label above their tank

#### Scenario: Viewing the local player's own tank
- **WHEN** the local player's own tank is visible in the arena
- **THEN** the frontend shows the local player's own actual name above their tank, marked so the local player can identify it as their own, instead of showing a generic literal label in place of the name
