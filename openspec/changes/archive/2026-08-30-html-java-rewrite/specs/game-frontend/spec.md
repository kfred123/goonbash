## ADDED Requirements

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
