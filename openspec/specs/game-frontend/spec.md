## Purpose

Defines viewport-based arena and combat rendering, click-to-move and target-lock input, player name labels, and match-result scoreboards.

## Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world using an HTML5 canvas engine, including an image-textured tilemap arena background, tanks, minions, bases, lane towers, in-flight projectiles, and player/unit health bars. It SHALL draw only the portion of the world within the camera's viewport rather than fitting the entire map on screen. Visible streets SHALL follow the same lane path geometry the backend uses for minion movement and tower placement, with entities rendered above the tilemap.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of entities currently within the camera's viewport, including lane towers, above the tilemap background

#### Scenario: Streets match lane paths
- **WHEN** the arena is rendered
- **THEN** the drawn street for each lane visually follows that lane's actual path (diagonal-straight-diagonal for the outer lanes, straight for the middle lane) rather than a fixed, independently authored tile layout

#### Scenario: Rendering combat feedback
- **WHEN** a projectile is added to or removed from the replicated game state, or a unit's HP changes
- **THEN** the frontend renders the projectile traveling toward its target while present and within the viewport, and updates that unit's health bar to reflect its current HP

#### Scenario: Rendering player death and respawn
- **WHEN** a player tank's state changes to dead or back to alive
- **THEN** the frontend hides the tank's sprite and health bar while dead, and shows them at the respawned position once alive and within the viewport

#### Scenario: Arena background is visible on game start
- **WHEN** the arena phase starts and the game world is displayed
- **THEN** the tilemap background is fully rendered before any game entities appear

#### Scenario: World larger than the viewport
- **WHEN** the game world's dimensions exceed the size of the visible screen
- **THEN** the frontend does not attempt to fit the whole world on screen at once, relying on the camera to determine what is currently visible

### Requirement: Render Lane Towers
The frontend SHALL render each lane tower as a small, team-colored fortified outpost with a visible cannon and a health bar that updates as the tower takes damage. The cannon SHALL rotate to face the tower's current target and SHALL visibly fire when the tower fires. The outpost design SHALL be visually smaller than the main-tower design while sharing its fortified visual style. When the tower is destroyed, the frontend SHALL render a static ruin at its last position until the match ends, without a health bar or active cannon. The ruin SHALL not be targetable or block movement.

#### Scenario: Tower takes damage
- **WHEN** a tower's hit points decrease in a state update
- **THEN** the frontend updates that tower's health bar to reflect the new hit points

#### Scenario: Tower destroyed
- **WHEN** a tower's hit points reach zero
- **THEN** the frontend replaces its outpost and health bar with a static ruin at the tower's last position
- **AND** the ruin remains visible until the match ends without being targetable or blocking movement

#### Scenario: Lane tower appears in the arena
- **WHEN** a lane tower is visible in the camera viewport
- **THEN** it is rendered as a small fortified outpost with a visible cannon and its existing health bar

#### Scenario: Tower tracks a target
- **WHEN** a lane tower has a current enemy target
- **THEN** its cannon rotates to face that target

#### Scenario: Tower fires
- **WHEN** a lane tower fires a projectile
- **THEN** its cannon visibly fires in the projectile's direction

#### Scenario: Destroyed tower cannot function
- **WHEN** a lane tower is represented as a ruin
- **THEN** it has no health bar or active cannon and cannot be selected as an attack target or block movement

### Requirement: Capture Player Input
The frontend SHALL capture game-field mouse clicks and translate them into move-to-point and attack-target commands using world coordinates and enemy identifiers. Click-to-move and target-lock SHALL replace raw directional keyboard movement; keyboard ability activation SHALL remain supported. The frontend SHALL ignore movement input for a tank that is dead and awaiting respawn.

#### Scenario: Player clicks the game field to move
- **WHEN** the player left-clicks empty ground on the game field while their tank is alive
- **THEN** the frontend sends a move-to-point command containing that point's world coordinates to the backend

#### Scenario: Player clicks an enemy to attack
- **WHEN** the player left-clicks an enemy tank, minion, lane tower, or enemy base sprite while their tank is alive
- **THEN** the frontend sends an attack-target command containing that enemy's id to the backend

#### Scenario: Player is dead
- **WHEN** the player's tank is currently dead and awaiting respawn
- **THEN** the frontend does not send movement commands for that tank until it has respawned

### Requirement: Display Player Names Above Tanks
The frontend SHALL render each player's actual display name in a label above their tank at all times the tank is alive and visible, including above the local player's own tank. The local player's own tank label SHALL be visually distinguishable from other players' labels (for example, via an indicator appended to the name) without replacing the name itself with a generic placeholder.

#### Scenario: Viewing another player's tank
- **WHEN** another player's tank is visible in the arena
- **THEN** the frontend shows that player's actual name in the label above their tank

#### Scenario: Viewing the local player's own tank
- **WHEN** the local player's own tank is visible in the arena
- **THEN** the frontend shows the local player's own actual name above their tank, marked so the local player can identify it as their own, instead of showing a generic literal label in place of the name

### Requirement: Display match outcome and team scoreboards
The frontend SHALL display a result screen when the match ends, identify the local player's team as victorious or defeated, and show a separate scoreboard for each team. Each scoreboard SHALL list every match participant on that team with their name, kills, final server-authoritative progression level, and damage dealt. Each scoreboard SHALL initially be sorted by kills from highest to lowest.

#### Scenario: Local player's team wins
- **WHEN** the match ends and the local player's team is the recorded winner
- **THEN** the frontend displays a victory message and both team scoreboards with final statistics

#### Scenario: Local player's team loses
- **WHEN** the match ends and the local player's team is not the recorded winner
- **THEN** the frontend displays a defeat message and both team scoreboards with final statistics

#### Scenario: Results are first displayed
- **WHEN** the result screen is displayed
- **THEN** each team's players are listed in descending order of kills

### Requirement: Sort team scoreboards
The frontend SHALL allow each team scoreboard to be sorted by kills, level, or damage dealt, in ascending or descending order.

#### Scenario: Player selects a sortable statistic
- **WHEN** the player activates the kills, level, or damage-dealt column heading
- **THEN** that team's scoreboard is sorted by the selected statistic
- **AND** activating the same heading again reverses its sort direction

### Requirement: Return to the main menu from match results
The frontend SHALL provide an action on the result screen that leaves the finished room and returns the player to the main menu.

#### Scenario: Player leaves match results
- **WHEN** the player activates the return-to-menu action
- **THEN** the client leaves the finished game room and displays the main menu
