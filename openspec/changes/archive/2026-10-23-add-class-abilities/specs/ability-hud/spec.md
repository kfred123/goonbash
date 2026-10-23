# Spec Delta

## MODIFIED Requirements

### Requirement: Ability HUD Display
The system SHALL display every ability available to the local player's role in the in-match HUD, showing each ability's name or icon, independent learned or locked state, current level when learned, and independent cooldown. Role assignment alone SHALL NOT make any ability ready.

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

### Requirement: Ability Activation Control
The system SHALL let the local player activate a learned ability through its dedicated HUD control or assigned key when that ability is off cooldown. Ability availability, learned state, cooldown, and effects SHALL be checked authoritatively on the server. Activation SHALL NOT learn or upgrade an ability or spend a skill point; separate, clearly labeled progression controls SHALL handle learning and upgrades.

#### Scenario: Player activates a learned ability
- **WHEN** the player activates a learned ability using its HUD control or assigned key
- **AND** that ability is off cooldown
- **THEN** the client sends an activation request identifying that ability

#### Scenario: Player activates ability via key
- **WHEN** the player presses the assigned key for a learned, off-cooldown ability
- **THEN** the system sends an activation request identifying that ability

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
- **AND** for Homing Rocket, the click enters target-selection mode instead of sending a direct fire request

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
