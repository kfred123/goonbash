## Purpose

Defines the client-side rendering of the 2D game world and the player-facing input and name-label behavior used during a match.

## Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world, including the map, tanks, minions, and bases using an HTML5 canvas engine.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of all entities on the screen

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
