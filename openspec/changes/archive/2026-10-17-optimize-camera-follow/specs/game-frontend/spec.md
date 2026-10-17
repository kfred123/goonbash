# Spec Delta

## MODIFIED Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world, including the map, tanks, minions, and bases using an HTML5 canvas engine, drawing only the portion of the world currently within the camera's viewport rather than the entire map at once.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of all entities currently within the camera's viewport

#### Scenario: World larger than the viewport
- **WHEN** the game world's dimensions exceed the size of the visible screen
- **THEN** the frontend does not attempt to fit the whole world on screen at once, relying on the camera to determine what is currently visible
