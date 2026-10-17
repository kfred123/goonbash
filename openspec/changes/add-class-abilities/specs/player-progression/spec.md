# Spec Delta

## MODIFIED Requirements

### Requirement: Spend Skill Points to Learn and Upgrade Abilities
The system SHALL allow a player to spend one skill point to learn an available role ability or raise that ability by one level. Each ability SHALL have an independent level from 0 through 10; level 0 means unlearned. The system SHALL reject purchases that exceed level 10, target an ability unavailable to the player's role, use an invalid ability identifier, or lack a skill point without changing player progression. Ability availability and effects SHALL be authoritative on the server.

#### Scenario: Player learns an available ability
- **WHEN** a player with at least one skill point purchases an unlearned ability available to their role
- **THEN** that ability becomes learned at level 1
- **AND** the player loses exactly one skill point

#### Scenario: Player upgrades a learned ability
- **WHEN** a player with at least one skill point purchases an ability below level 10
- **THEN** that ability's level increases by one
- **AND** the player loses exactly one skill point

#### Scenario: Ability levels are independent
- **WHEN** a player upgrades one role ability
- **THEN** the levels of all other abilities remain unchanged

#### Scenario: Invalid ability purchase is rejected
- **WHEN** a player attempts a purchase without a skill point, for an unavailable or invalid ability, or above ability level 10
- **THEN** the server leaves the player's skill points and all ability levels unchanged

### Requirement: Show and Operate Progression in the Match HUD
The in-match HUD SHALL show the local player's level, experience progress toward the next level, and an explicitly labeled count of unspent skill points currently available to allocate, including zero. It SHALL present every ability available to the player's role with that ability's learned or locked state and current level, and allow the player to request a learn or upgrade purchase for an individual ability using a skill point. Activation and learning/upgrading SHALL use separate, clearly labeled and visually distinguishable controls.

#### Scenario: Player checks progression
- **WHEN** the local player's progression changes
- **THEN** the HUD displays the updated level, experience progress, and skill-point count

#### Scenario: Experience progress is shown within the current level
- **WHEN** the local player has earned 50 XP toward the 200 XP required to advance from level 2
- **THEN** the HUD displays a 25-percent-filled progress bar followed by `50 / 200 XP`, not a cumulative lifetime XP count

#### Scenario: Experience counter resets at the next level
- **WHEN** a level-1 player reaches exactly 100 XP and advances to level 2
- **THEN** the HUD displays an empty progress bar followed by `0 / 200 XP`

#### Scenario: Excess experience becomes progress in the new level
- **WHEN** a level-1 player with 90 XP receives a 50 XP reward
- **THEN** the player advances to level 2 and the HUD displays a 20-percent-filled progress bar followed by `40 / 200 XP`

#### Scenario: Player chooses an ability purchase
- **WHEN** the local player has an available skill point and selects an eligible learn or upgrade action for one ability in the HUD
- **THEN** the HUD sends a purchase request identifying that ability
- **AND** the HUD reflects the resulting server-authoritative ability state

#### Scenario: Activation and upgrade are separate actions
- **WHEN** the player selects an ability's activation control
- **THEN** the HUD sends only an activation request and does not request an upgrade or spend a skill point

#### Scenario: Upgrade does not activate the ability
- **WHEN** the player selects an ability's learn or upgrade control
- **THEN** the HUD sends only a purchase request and does not activate the ability

#### Scenario: Available skill points decrease after a purchase
- **WHEN** the server confirms a purchase that spends the player's last unspent skill point
- **THEN** the HUD shows zero available skill points and disables further purchases without disabling otherwise eligible ability activation
