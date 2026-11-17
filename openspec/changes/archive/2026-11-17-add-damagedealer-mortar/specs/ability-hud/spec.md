# Spec Delta

## MODIFIED Requirements

### Requirement: Ability HUD Display
The system SHALL display every ability available to the local player's role in the in-match HUD, showing each ability's name or icon, independent learned or locked state, current level when learned, and independent cooldown. Role assignment alone SHALL NOT make any ability ready. The Damagedealer SHALL have three ability slots ordered Rapid Fire, Homing Rocket, and Mortar, labeled with `SPACE`, `E`, and `R` respectively. Other roles SHALL retain their two abilities and existing shortcuts. All activation and learn/upgrade controls SHALL remain visible, distinguishable, and non-overlapping across supported viewport sizes and resize events.

#### Scenario: HUD shows ability icon
- **WHEN** the local player's tank has a role assigned
- **THEN** the bottom HUD displays an icon for every ability available to that role, including each ability's learned or locked state

#### Scenario: HUD reflects independent cooldowns
- **WHEN** one learned ability is on cooldown and another learned ability is ready
- **THEN** the HUD shows the remaining cooldown only for the ability that is cooling down
- **AND** the other ability remains available

#### Scenario: HUD reflects cooldown
- **WHEN** a learned ability is on cooldown
- **THEN** the HUD visually indicates that ability's remaining cooldown with a fill or countdown
- **AND** once its cooldown elapses the HUD indicates that ability is ready

#### Scenario: Ability levels are independent
- **WHEN** the local player upgrades one ability
- **THEN** the HUD updates that ability's level without changing another ability's level

#### Scenario: Three Damagedealer slots
- **WHEN** the local player is a Damagedealer
- **THEN** the HUD displays Rapid Fire, Homing Rocket, and Mortar with independent activation and purchase controls and the shortcuts SPACE, E, and R

#### Scenario: Viewport changes
- **WHEN** the viewport is resized within supported sizes while three Damagedealer slots are displayed
- **THEN** all three slots and progression controls remain usable without overlapping hit regions

### Requirement: Ability Activation Control
The system SHALL let the local player activate a learned ability through its dedicated HUD control or assigned key when that ability is off cooldown. Ability availability, learned state, cooldown, and effects SHALL be checked authoritatively on the server. Activation SHALL NOT learn or upgrade an ability or spend a skill point; separate, clearly labeled progression controls SHALL handle learning and upgrades.

Homing Rocket activation SHALL enter enemy-target selection; Mortar activation SHALL enter ground-area selection. Neither selection entry SHALL launch a projectile or consume cooldown. There SHALL be at most one active selection mode. Re-selecting the same targeting ability, Escape, or right-click SHALL cancel selection without issuing a movement or attack command. Selecting another eligible ability SHALL clear the previous selection, and repeated keydown events SHALL NOT repeatedly toggle selection or activate abilities.

#### Scenario: Player activates a learned ability
- **WHEN** the player activates a learned ability using its HUD control or assigned key
- **AND** that ability is off cooldown
- **THEN** the client sends an activation request identifying that ability, or enters the appropriate selection mode for Homing Rocket or Mortar

#### Scenario: Player activates ability via key
- **WHEN** the player presses the assigned key for a learned, off-cooldown ability
- **THEN** the system sends an activation request identifying that ability, or enters the appropriate selection mode for Homing Rocket or Mortar

#### Scenario: Player selects the homing rocket
- **WHEN** a Damagedealer selects the homing rocket's HUD control or assigned key
- **THEN** the client enters rocket target-selection mode without activating or putting the rocket on cooldown

#### Scenario: Player chooses a valid rocket target
- **WHEN** the Damagedealer clicks a valid enemy while rocket target-selection mode is active
- **THEN** the client sends an activation request identifying the homing rocket and selected target
- **AND** the click does not issue a move or ordinary attack command

#### Scenario: Player activates ability via HUD click
- **WHEN** the player clicks or taps a learned ability's HUD activation control
- **AND** that ability is off cooldown
- **THEN** the system sends an activation request identifying that ability
- **AND** for Homing Rocket or Mortar, the click enters the appropriate selection mode instead of sending a direct fire request

#### Scenario: Player cancels rocket target selection
- **WHEN** the Damagedealer cancels target-selection mode
- **THEN** the client leaves the mode without firing a rocket or changing its cooldown

#### Scenario: Activation attempted during cooldown
- **WHEN** the player attempts to activate an ability while it is on cooldown
- **THEN** the system does not trigger that ability
- **AND** the HUD gives no indication that a new activation succeeded

#### Scenario: Activation attempted while locked
- **WHEN** a player attempts to activate an unavailable or unlearned ability using any activation input or a direct request
- **THEN** the server rejects activation without changing skill points or learning the ability
- **AND** the HUD continues to show the ability as locked

#### Scenario: Invalid rocket target
- **WHEN** the server receives a rocket activation request with a friendly, dead, missing, unsupported, or out-of-range target
- **THEN** the server does not fire a rocket or start the rocket cooldown

#### Scenario: Mortar aiming preview
- **WHEN** a Damagedealer selects learned, ready Mortar through its HUD control or R
- **THEN** the client displays a 900-world-unit range indicator and a cursor-centered 120-world-unit blast preview
- **AND** the preview distinguishes valid and invalid points using world bounds and range, not enemy presence or current vision

#### Scenario: Confirm Mortar ground point
- **WHEN** the player left-clicks a valid arena point while Mortar selection is active
- **THEN** the client requests Mortar activation with that fixed world position and exits selection
- **AND** the click does not send a movement command, ordinary attack, or Rocket request

#### Scenario: Invalid Mortar click
- **WHEN** the player clicks an out-of-bounds or out-of-range arena point during Mortar selection
- **THEN** a clear invalid-point hint is shown and selection remains active
- **AND** no activation, movement, or attack request is sent

#### Scenario: HUD or minimap click
- **WHEN** the player clicks the HUD or minimap while Mortar selection is active
- **THEN** that click does not confirm a ground shot or issue a movement or attack command

#### Scenario: Cancel or switch targeting
- **WHEN** a player presses Escape, right-clicks, re-selects the current targeting ability, or selects another eligible ability
- **THEN** the prior selection and its preview are cleared without firing or consuming its cooldown
- **AND** selecting another ability starts only that ability's normal activation or targeting flow

#### Scenario: Key is held down
- **WHEN** the browser repeats a held ability key
- **THEN** repeated keydown events do not toggle targeting or send repeated activation requests

#### Scenario: Targeting lifecycle ends
- **WHEN** the local player dies, the match ends, or the player leaves the arena
- **THEN** Mortar selection and all associated preview graphics are cleared

#### Scenario: Server rejects a stale Mortar request
- **WHEN** the server rejects a submitted Mortar request because the authoritative launch conditions no longer hold
- **THEN** the client displays the rejection and retains the authoritative cooldown state without claiming a successful launch

## ADDED Requirements

### Requirement: Weapon Targeting Cursor
While Homing Rocket target selection is active, the system SHALL replace the normal mouse pointer with a clearly visible red crosshair. While Mortar ground selection is active, it SHALL replace the normal pointer with a recognizable bomb-shaped cursor. The weapon cursor SHALL track the mouse position accurately, with its aiming hotspot matching the actual click position regardless of camera movement, zoom, or viewport resize. It SHALL remain legible over terrain, fog, and the HUD and SHALL remain the active cursor over the game canvas, including interactive controls, for as long as selection remains active. The normal arrow or hand pointer SHALL NOT appear alongside or instead of the active weapon cursor. The Mortar blast preview SHALL remain visible in addition to its bomb cursor when aiming at the arena.

Weapon cursors SHALL indicate selection mode, not whether a target is valid or a shot has succeeded. Invalid targets SHALL NOT restore the normal pointer while selection remains active. Leaving selection by confirmation, cancellation, switching to a non-targeting ability, death, match end, leaving the arena, or scene teardown SHALL restore ordinary cursor behavior. Switching directly between Rocket and Mortar selection SHALL immediately change the cursor to the corresponding symbol. Outside the game canvas, the page SHALL retain ordinary cursor behavior.

#### Scenario: Select Rocket with mouse or key
- **WHEN** the player enters Homing Rocket target selection through the HUD or its assigned key
- **THEN** a red crosshair replaces the normal mouse pointer immediately
- **AND** it remains visible even when the mouse is not over a valid enemy

#### Scenario: Select Mortar with mouse or key
- **WHEN** the player enters Mortar ground selection through the HUD or R
- **THEN** a bomb-shaped cursor replaces the normal pointer immediately
- **AND** the blast preview remains additional feedback at the selected arena point

#### Scenario: Switch targeting weapons
- **WHEN** the player switches directly from Rocket selection to Mortar selection or back
- **THEN** the cursor immediately changes between red crosshair and bomb without displaying both symbols

#### Scenario: Invalid click keeps weapon cursor
- **WHEN** an invalid target click leaves weapon selection active
- **THEN** the matching weapon cursor remains visible without issuing an ordinary movement or attack command

#### Scenario: Weapon cursor over controls
- **WHEN** the pointer crosses a HUD control or minimap within the canvas while weapon selection remains active
- **THEN** the weapon cursor remains visible instead of a hand or normal arrow
- **AND** existing control hit testing and the exclusion of HUD/minimap clicks from shot confirmation remain unchanged

#### Scenario: Target selection finishes
- **WHEN** selection ends through confirmation, cancellation, switching to a non-targeting ability, death, match end, leaving the arena, or scene teardown
- **THEN** the weapon cursor is removed and ordinary cursor behavior is restored
- **AND** a later server rejection does not restore the weapon cursor while selection is inactive

#### Scenario: Cursor remains aligned
- **WHEN** the camera moves or zooms, or the viewport is resized during selection
- **THEN** the weapon cursor's aiming hotspot remains at the actual mouse click position

#### Scenario: Pointer leaves and reenters canvas
- **WHEN** the pointer leaves the game canvas and returns while selection remains active
- **THEN** the page outside the canvas uses its ordinary cursor and the canvas again shows the selected weapon cursor without duplicate or missing pointers
