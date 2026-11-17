## Purpose

Defines viewport-based arena and combat rendering, click-to-move and target-lock input, player name labels, and match-result scoreboards.

## Requirements

### Requirement: Render Main Bases as Fortress Keeps
The frontend SHALL render each main base as a large team-colored, crenellated keep with a prominent central cannon turret. The cannon SHALL visibly rotate to face the base's current enemy target and SHALL show a firing effect when the base fires.

#### Scenario: Main base appears in the arena
- **WHEN** a main base is visible in the camera viewport
- **THEN** it is rendered as a fortress keep with a clearly visible central cannon and its existing health bar

#### Scenario: Main base tracks a target
- **WHEN** a main base has a current enemy target
- **THEN** its cannon rotates to face that target

#### Scenario: Main base fires
- **WHEN** a main base fires a projectile
- **THEN** the cannon visibly fires in the projectile's direction

#### Scenario: Close-range shot impacts before replication
- **WHEN** a main-base projectile hits and is removed in the same simulation update in which it was created
- **THEN** clients still show the muzzle flash using the recorded firing direction, even if the target has already been removed

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

### Requirement: Centrally configurable arena entity scale

The frontend SHALL apply a centrally adjustable entity-size factor relative to the pre-change presentation, defaulting to 1.20, to the linear dimensions of all arena player roles, mobs/minions, lane towers, main-base towers, and destroyed lane-tower ruins. Each entity's chassis, turret, shadow, and attached visual decorations SHALL remain proportionally aligned where present. Role-selection previews, HUD elements, minimap markers, camera zoom, and font sizes SHALL retain their existing screen-space sizing.

#### Scenario: Arena entities use the default larger dimensions
- **WHEN** an arena uses the default entity-size factor
- **THEN** a player's nominal size is 48 world units instead of 40 and a minion's nominal size is 21.6 instead of 18
- **AND** lane towers, main-base towers, and lane-tower ruins have linear visual dimensions equal to 1.20 times their pre-change dimensions
- **AND** all player roles retain their distinctive proportions and lane towers remain visually smaller than main-base towers

#### Scenario: Future entity-size tuning has one adjustment point
- **WHEN** the entity-size factor is changed and the application is rebuilt and restarted
- **THEN** every affected arena entity and its attached presentation uses that factor without requiring edits to individual drawing constants
- **AND** setting the factor to 1.00 restores the original entity dimensions
- **AND** neither road width nor the clear grass gap changes

#### Scenario: World scaling does not resize screen-space presentation
- **WHEN** entities are enlarged in the arena
- **THEN** role-selection previews, HUD elements, minimap markers, font sizes, and camera zoom retain their previous sizes or settings

### Requirement: Interaction and feedback remain aligned with scaled entities

Entity-associated name labels, health bars, target indicators, and structure firing feedback SHALL remain aligned with the scaled arena presentation during creation, movement interpolation, updates, visibility changes, destruction, and respawn. Labels and health bars SHALL remain clear of the larger bodies. Existing click-selection areas SHALL scale with their respective entity presentations. Structure projectile origins and muzzle flashes SHALL agree with the enlarged cannon muzzle positions. Hidden enemies and ruins SHALL retain their existing selection restrictions.

#### Scenario: Enlarged units move and respawn
- **WHEN** a scaled player or minion is created, interpolated, updated, or respawned
- **THEN** its health bar and any name label remain correctly positioned without intersecting its body
- **AND** its target feedback and attached effects remain aligned

#### Scenario: Selection area follows the enlarged presentation
- **WHEN** a click falls outside an eligible enemy entity's original click radius but inside its radius multiplied by the configured entity-size factor
- **THEN** the click selects that enemy according to the existing nearest-target selection rules
- **AND** concealed enemies and destroyed towers remain ineligible for selection

#### Scenario: A scaled structure fires
- **WHEN** a visible lane tower or main-base tower fires in any direction
- **THEN** its muzzle flash and authoritative projectile origin match its scaled cannon muzzle position
- **AND** a shot removed before replication still produces correctly positioned feedback under the existing visibility rules

#### Scenario: Presentation scaling preserves gameplay parameters
- **WHEN** the entity-size factor changes
- **THEN** damage, health, attack and ability ranges, cooldowns, movement speeds, collision and projectile-hit radii, and vision ranges remain unchanged
- **AND** only structure muzzle origins and client-side click-selection areas follow the new presentation size

### Requirement: Player Tank Cannon Returns to Facing Direction
The frontend SHALL smoothly rotate a player tank's cannon to face its current valid unit in attack focus using the shortest angular path. When the tank has no valid unit in attack focus, the cannon SHALL smoothly return to face the tank's current facing direction.

#### Scenario: Tank has a unit in attack focus
- **WHEN** a player tank has a valid unit in attack focus
- **THEN** its cannon faces that unit

#### Scenario: Tank has no unit in attack focus
- **WHEN** a player tank has no valid unit in attack focus
- **THEN** its cannon faces the same direction as the tank

#### Scenario: Attack focus is lost
- **WHEN** a player tank's unit in attack focus becomes invalid or unavailable
- **THEN** its cannon returns to the tank's current facing direction

#### Scenario: Cannon direction changes
- **WHEN** the desired cannon heading changes
- **THEN** the cannon moves smoothly toward that heading along the shortest rotation path
