## ADDED Requirements

### Requirement: Distinct Visual Appearance per Role
The system SHALL render each tank with a color and shape that is visually distinct per role (Healer, Tank, Damagedealer), so a player's role is identifiable at a glance during gameplay and in the lobby.

#### Scenario: Tank rendered in game world
- **WHEN** a tank with a given role is rendered in the game view
- **THEN** its fill color and shape correspond to that role
- **AND** differ from the color and shape used for the other two roles

#### Scenario: Role preview in lobby
- **WHEN** a player views the role selection controls in the waiting lobby
- **THEN** each role card displays the same color/shape that the role's tank will use in-game
