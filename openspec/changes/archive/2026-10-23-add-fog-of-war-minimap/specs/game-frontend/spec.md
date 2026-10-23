## MODIFIED Requirements

### Requirement: Render Game World
The frontend SHALL render the 2D game world using an HTML5 canvas engine, including an image-textured tilemap arena background, tanks, minions, bases, lane towers, in-flight projectiles, and player/unit health bars. It SHALL draw only the portion of the world within the camera's viewport rather than fitting the entire map on screen. Visible streets SHALL follow the same lane path geometry the backend uses for minion movement and tower placement, with entities rendered above the tilemap. Terrain outside the local team's current shared vision SHALL be dimmed. Enemy entity presentation SHALL be shown only within team vision, while allied presentation follows existing life-state rules. Projectile rendering SHALL follow the visibility rules in unit-combat-targeting.

#### Scenario: Rendering game state
- **WHEN** a state update is received from the server
- **THEN** the frontend updates the positions and animations of eligible allied and team-visible enemy entities currently within the camera's viewport, including lane towers, above the tilemap background

#### Scenario: Streets match lane paths
- **WHEN** the arena is rendered
- **THEN** the drawn street for each lane visually follows that lane's actual path (diagonal-straight-diagonal for the outer lanes, straight for the middle lane) rather than a fixed, independently authored tile layout

#### Scenario: Rendering combat feedback
- **WHEN** a projectile is added to or removed from the replicated game state, or a unit's HP changes
- **THEN** the frontend renders eligible projectiles traveling toward their targets while present and within the viewport, and updates health bars only for entities whose presentation is visible

#### Scenario: Rendering player death and respawn
- **WHEN** a player tank's state changes to dead or back to alive
- **THEN** the frontend hides the tank's sprite, name, decorations, and health bar while dead, and shows them at the respawned position once alive and within the viewport if allied or currently team-visible

#### Scenario: Arena background is visible on game start
- **WHEN** the arena phase starts and the game world is displayed
- **THEN** the tilemap background and initial team fog are rendered before enemy entities can appear

#### Scenario: World larger than the viewport
- **WHEN** the game world's dimensions exceed the size of the visible screen
- **THEN** the frontend does not attempt to fit the whole world on screen at once, relying on the camera to determine what is currently visible
- **AND** the minimap provides the separate whole-arena overview

#### Scenario: Enemy becomes concealed between render frames
- **WHEN** a state update places an enemy outside current team vision
- **THEN** its entire presentation is hidden on that update even if interpolation or a deferred fog texture refresh would otherwise keep it onscreen

#### Scenario: Late effect callback for a concealed enemy
- **WHEN** a tween or state callback updates an enemy effect after that enemy loses team visibility
- **THEN** the callback does not reshow the effect or expose the concealed enemy

#### Scenario: Network removes a concealed entity
- **WHEN** an entity is removed from the receiving client's visibility-scoped state
- **THEN** the frontend destroys its complete presentation, health bar, effects, interpolation, shot-count cache and any target markers as applicable, and removes its minimap dot without treating concealment as a death event

#### Scenario: Network restores an unchanged structure
- **WHEN** a stationary enemy base or tower is added again after a scout reveals it
- **THEN** its current allowed appearance is recreated without replaying shots missed while concealed

### Requirement: Render Lane Towers
The frontend SHALL render each allied or currently team-visible lane tower as a small, team-colored fortified outpost with a visible cannon and a health bar that updates as the tower takes damage. The cannon SHALL rotate to face the tower's current target and SHALL visibly fire when the tower fires while visible. The outpost design SHALL be visually smaller than the main-tower design while sharing its fortified visual style. When the tower is destroyed, the frontend SHALL render a static ruin at its last position until the match ends, without a health bar or active cannon, subject to current team visibility for enemy ruins. The ruin SHALL not be targetable or block movement.

#### Scenario: Tower takes damage
- **WHEN** a visible tower's hit points decrease in a state update
- **THEN** the frontend updates that tower's health bar to reflect the new hit points

#### Scenario: Tower destroyed
- **WHEN** a tower's hit points reach zero
- **THEN** the frontend replaces its outpost and health bar with a static ruin at the tower's last position
- **AND** the ruin remains in the world until the match ends without being targetable or blocking movement, and is rendered only when allied or currently team-visible

#### Scenario: Lane tower appears in the arena
- **WHEN** a lane tower is eligible under team visibility and inside the camera viewport
- **THEN** it is rendered as a small fortified outpost with a visible cannon and its existing health bar

#### Scenario: Tower tracks a target
- **WHEN** a visible lane tower has a current enemy target
- **THEN** its cannon rotates to face that target without displaying a target-follow marker on any concealed target

#### Scenario: Tower fires
- **WHEN** a visible lane tower fires a projectile
- **THEN** its cannon visibly fires in the projectile's direction

#### Scenario: Destroyed tower cannot function
- **WHEN** a lane tower is represented as a ruin
- **THEN** it has no health bar or active cannon and cannot be selected as an attack target or block movement

#### Scenario: Enemy tower leaves team vision
- **WHEN** an enemy tower or its ruin leaves current shared vision
- **THEN** its outpost, cannon, ruin, health bar, and any muzzle flash are hidden

### Requirement: Capture Player Input
The frontend SHALL capture game-field mouse clicks and translate them into move-to-point and attack-target commands using world coordinates and team-visible enemy identifiers. Click-to-move and target-lock SHALL replace raw directional keyboard movement; keyboard ability activation SHALL remain supported. The frontend SHALL ignore movement input for a tank that is dead and awaiting respawn. Hidden enemies SHALL be excluded from attack and targeted-ability hit testing. HUD and minimap clicks SHALL NOT be translated into world commands.

#### Scenario: Player clicks the game field to move
- **WHEN** the player left-clicks empty ground on the game field while their tank is alive
- **THEN** the frontend sends a move-to-point command containing that point's world coordinates to the backend, including when the ground is dark

#### Scenario: Player clicks an enemy to attack
- **WHEN** the player left-clicks a team-visible enemy tank, minion, lane tower, or enemy base sprite while their tank is alive
- **THEN** the frontend sends an attack-target command containing that enemy's id to the backend

#### Scenario: Player is dead
- **WHEN** the player's tank is currently dead and awaiting respawn
- **THEN** the frontend does not send movement commands for that tank until it has respawned

#### Scenario: Server rejects a stale visible target
- **WHEN** the server rejects an attack or rocket target because the target is no longer visible
- **THEN** the frontend clears any pending target feedback and displays the rejection without exposing the target's hidden position
