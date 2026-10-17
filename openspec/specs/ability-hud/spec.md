## Purpose

Defines the bottom-screen role ability HUD, learned-state and cooldown feedback, and activation controls separate from progression purchases.

## Requirements

### Requirement: Ability HUD Display
The system SHALL display the local player's role-specific special ability in a HUD element anchored to the bottom of the screen, showing its icon, learned or locked state, current level when learned, and cooldown. Role assignment alone SHALL NOT make an unlearned ability ready.

#### Scenario: HUD shows ability icon
- **WHEN** the local player's tank has a role assigned
- **THEN** the bottom HUD displays the icon for that role's special ability and its learned or locked state

#### Scenario: HUD reflects cooldown
- **WHEN** a learned special ability is on cooldown
- **THEN** the HUD visually indicates the remaining cooldown with a fill or countdown
- **AND** once the cooldown elapses the HUD indicates the learned ability is ready

### Requirement: Ability Activation Control
The system SHALL let the local player trigger their learned special ability via a dedicated key press or a click/tap on its HUD activation control when off cooldown. Ability availability and learned state SHALL be checked authoritatively on the server for all abilities, including legacy abilities. Activation SHALL NOT learn or upgrade an ability or spend a skill point; separate, clearly labeled progression controls SHALL handle learning and upgrades.

#### Scenario: Player activates ability via key
- **WHEN** the player presses the designated ability key
- **AND** the current role's ability is learned, available, and off cooldown
- **THEN** the system sends an activation request for that ability

#### Scenario: Player activates ability via HUD click
- **WHEN** the player clicks or taps the HUD ability activation control
- **AND** the current role's ability is learned, available, and off cooldown
- **THEN** the system sends an activation request for that ability without requesting a purchase

#### Scenario: Activation attempted during cooldown
- **WHEN** the player attempts to activate the ability while it is on cooldown
- **THEN** the system does not trigger the ability
- **AND** the HUD gives no indication that a new activation succeeded

#### Scenario: Activation attempted while locked
- **WHEN** a player attempts to activate an unavailable or unlearned ability using any activation input or a direct request
- **THEN** the server rejects activation without changing skill points or learning the ability
- **AND** the HUD continues to show the ability as locked
