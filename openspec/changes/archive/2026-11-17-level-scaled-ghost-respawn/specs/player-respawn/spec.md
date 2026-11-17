# Spec Delta

## MODIFIED Requirements

### Requirement: Player Death on Zero HP
When a player tank's HP reaches zero during an ongoing match, the system SHALL immediately remove it from active play and relocate it to a randomized valid position near its own team's main base, outside the base structure and offset from its exact coordinates according to the existing team-base positioning rules. The dead tank SHALL remain stationary with zero HP until respawn, SHALL NOT fire, activate abilities, be targeted, receive damage or healing, or contribute team vision, and SHALL appear only as a translucent respawn preview rather than as a living combatant.

#### Scenario: Tank HP reaches zero
- **WHEN** a player tank's HP is reduced to 0 or below by incoming damage during a started match
- **THEN** the tank immediately stops responding to movement input, stops firing, clears its movement destination and target locks, and cancels active ability effects
- **AND** the tank is excluded from all enemy targeting and is repositioned near its own main base for the respawn preview

#### Scenario: Preview is not an active unit
- **WHEN** a dead tank is awaiting respawn near its main base
- **THEN** movement, attack, and ability activation commands cannot move it or produce attacks or ability effects
- **AND** it cannot be targeted, damaged, healed, or used as a vision observer

#### Scenario: Death rewards use the combat location
- **WHEN** a tank dies away from its main base and is immediately relocated for the preview
- **THEN** nearby-player kill experience is evaluated at the original death location rather than the preview location

### Requirement: Respawn at Team Base
After dying during an ongoing match, a player tank SHALL respawn after a server-authoritative delay of exactly its level at death multiplied by two seconds. The delay SHALL be calculated once per death and SHALL NOT be restarted or recalculated during the wait. At the first simulation update at or after the deadline while the match is started, the tank SHALL return to active play with full current maximum HP at its existing preview position without another relocation. Role-based stats, progression bonuses, and learned ability levels SHALL be retained.

#### Scenario: Respawn timer elapses
- **WHEN** the level-scaled respawn deadline has been reached during a started match
- **THEN** the tank's HP is restored to its current maximum at the preview position near its team's main base
- **AND** it becomes fully opaque, targetable, and controllable again and the respawn countdown disappears

#### Scenario: Player attempts to move while dead
- **WHEN** a player sends movement input while their tank is dead and awaiting respawn
- **THEN** the input is ignored until the tank has respawned
- **AND** the ignored input is not queued for execution after respawn

#### Scenario: Level determines delay
- **WHEN** a level-1, level-5, or level-10 player dies
- **THEN** the respective respawn delay is 2, 10, or 20 seconds from that death

#### Scenario: Deadline has not been reached
- **WHEN** the server time is earlier than the calculated respawn deadline
- **THEN** the tank remains dead and inactive even if the local countdown has reached zero

#### Scenario: Repeated deaths have independent deadlines
- **WHEN** a player respawns, later gains a level, and dies again
- **THEN** the second death creates a new deadline using the new level and the time of the second death

#### Scenario: Match ends before respawn
- **WHEN** the match ends while a player is awaiting respawn
- **THEN** no subsequent timer expiry returns that player to active play in the ended match
- **AND** the result presentation does not display an active respawn countdown

## ADDED Requirements

### Requirement: Allied Translucent Respawn Preview
During the respawn wait, the tank's normal role-specific figure SHALL be displayed at 50% opacity at its respawn position to its owner and teammates. Enemy clients SHALL NOT receive or display the dead tank's preview even when that position is within their team's vision. The preview SHALL NOT show a living health bar, firing effects, active ability effects, or selectable combat hit region. On death, the figure SHALL jump to its preview position rather than visibly travel from the death location; the owner's existing camera follow SHALL continue to follow their relocated figure.

#### Scenario: Owner and teammates see the preview
- **WHEN** a player dies and the authoritative dead state reaches the owner's and teammates' clients
- **THEN** those clients display the player's role-specific figure at 50% opacity near its own main base
- **AND** no normal combat figure remains at the death location

#### Scenario: Enemy sees the base area
- **WHEN** an enemy team's current vision includes the dead player's preview position
- **THEN** the enemy client receives no preview tank entity and displays no preview figure or attached labels

#### Scenario: Camera follows the preview
- **WHEN** the local player's figure relocates after death
- **THEN** its displayed position immediately becomes the preview position and the camera continues following that figure

#### Scenario: Return to normal presentation
- **WHEN** the server changes the tank back to alive
- **THEN** the figure returns to full opacity with its normal health bar and existing living-unit visibility rules

### Requirement: Owner-Only Respawn Countdown
Only the dead player's own client SHALL display a countdown above their preview. The countdown SHALL use the server-authoritative respawn deadline, refresh continuously between state updates, and show remaining whole seconds rounded up with a lower bound of zero. Teammates and enemies SHALL NOT display the countdown; the exact respawn deadline SHALL be replicated only to the owner. Displaying zero SHALL NOT locally activate the tank before server confirmation. The countdown SHALL be removed when the tank becomes alive, is removed, the room is left, or the result screen is shown.

#### Scenario: Owner sees remaining time
- **WHEN** the local player's preview has 4.2 seconds remaining until its deadline
- **THEN** only that player's client displays `5s` above the preview
- **AND** the label follows the displayed figure and updates to `4s` when 4 seconds remain

#### Scenario: Teammate sees the preview without the countdown
- **WHEN** a teammate receives a dead player's preview
- **THEN** that client displays the translucent figure without a countdown and does not receive that player's exact respawn deadline

#### Scenario: Client reaches the deadline before confirmation
- **WHEN** the local estimated remaining time is zero but the authoritative tank state is still dead
- **THEN** the countdown displays `0s` without a negative value and the tank remains translucent and uncontrollable

#### Scenario: Countdown resources are cleaned up
- **WHEN** the player respawns, their tank is removed, they leave the room, or the result screen is shown
- **THEN** no countdown label or continuing countdown update remains for that preview
