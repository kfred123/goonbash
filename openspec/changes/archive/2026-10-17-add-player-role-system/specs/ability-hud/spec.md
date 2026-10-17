## ADDED Requirements

### Requirement: Ability HUD Display
The system SHALL display the local player's role-specific special ability in a HUD element anchored to the bottom of the screen, showing an icon for the ability and its current cooldown state.

#### Scenario: HUD shows ability icon
- **WHEN** the local player's tank has a role assigned
- **THEN** the bottom HUD displays the icon for that role's special ability

#### Scenario: HUD reflects cooldown
- **WHEN** the special ability is on cooldown
- **THEN** the HUD visually indicates the remaining cooldown (e.g. a fill or countdown)
- **AND** once the cooldown elapses the HUD indicates the ability is ready

### Requirement: Ability Activation Control
The system SHALL let the local player trigger their special ability from the HUD via a dedicated key press or a click/tap on the HUD ability icon.

#### Scenario: Player activates ability via key
- **WHEN** the player presses the designated ability key
- **AND** the ability is off cooldown
- **THEN** the system sends an activation request for the player's current role's ability

#### Scenario: Player activates ability via HUD click
- **WHEN** the player clicks or taps the HUD ability icon
- **AND** the ability is off cooldown
- **THEN** the system sends an activation request for the player's current role's ability

#### Scenario: Activation attempted during cooldown
- **WHEN** the player attempts to activate the ability while it is on cooldown
- **THEN** the system does not trigger the ability
- **AND** the HUD gives no indication that a new activation succeeded
