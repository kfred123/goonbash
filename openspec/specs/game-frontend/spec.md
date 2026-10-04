## Purpose

Defines the client-side rendering of the 2D game world and the player-facing input and name-label behavior used during a match.

## Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world, including the map, tanks, minions, bases, and lane towers using an HTML5 canvas engine, drawing the visible streets so they follow the same lane path geometry the backend uses for minion movement and tower placement.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of all entities on the screen, including lane towers

#### Scenario: Streets match lane paths
- **WHEN** the arena is rendered
- **THEN** the drawn street for each lane visually follows that lane's actual path (diagonal-straight-diagonal for the outer lanes, straight for the middle lane) rather than a fixed, independently authored tile layout

### Requirement: Render Lane Towers
The frontend SHALL render each lane tower as a team-colored sprite with a health bar that updates as the tower takes damage, and remove the sprite when the tower is destroyed.

#### Scenario: Tower takes damage
- **WHEN** a tower's hit points decrease in a state update
- **THEN** the frontend updates that tower's health bar to reflect the new hit points

#### Scenario: Tower destroyed
- **WHEN** a tower is removed from the game state
- **THEN** the frontend removes that tower's sprite and health bar from the screen

### Requirement: Capture Player Input
The frontend SHALL capture player keyboard and mouse inputs and translate them into movement and action commands.

#### Scenario: Player moves tank
- **WHEN** the player presses the 'W' key
- **THEN** the frontend sends a movement command (up) to the backend

### Requirement: Display Player Names Above Tanks
The frontend SHALL render each player's actual display name in a label above their tank at all times the tank is alive and visible, including above the local player's own tank. The local player's own tank label SHALL be visually distinguishable from other players' labels (for example, via an indicator appended to the name) without replacing the name itself with a generic placeholder.

#### Scenario: Viewing another player's tank
- **WHEN** another player's tank is visible in the arena
- **THEN** the frontend shows that player's actual name in the label above their tank

#### Scenario: Viewing the local player's own tank
- **WHEN** the local player's own tank is visible in the arena
- **THEN** the frontend shows the local player's own actual name above their tank, marked so the local player can identify it as their own, instead of showing a generic literal label in place of the name
