## MODIFIED Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world, including the map, tanks, minions, bases, in-flight projectiles, and player/unit health bars, using an HTML5 canvas engine.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of all entities on the screen

#### Scenario: Rendering combat feedback
- **WHEN** a projectile is added to or removed from the replicated game state, or a unit's HP changes
- **THEN** the frontend renders the projectile traveling toward its target while present, and updates that unit's health bar to reflect its current HP

#### Scenario: Rendering player death and respawn
- **WHEN** a player tank's state changes to dead or back to alive
- **THEN** the frontend hides the tank's sprite and health bar while dead, and shows it again at the respawned position once alive

### Requirement: Capture Player Input
The frontend SHALL capture player keyboard and mouse inputs and translate them into movement and action commands, while ignoring movement input for a tank that is currently dead and awaiting respawn.

#### Scenario: Player moves tank
- **WHEN** the player presses the 'W' key
- **THEN** the frontend sends a movement command (up) to the backend

#### Scenario: Player is dead
- **WHEN** the player's tank is currently dead and awaiting respawn
- **THEN** the frontend does not send movement commands for that tank until it has respawned
