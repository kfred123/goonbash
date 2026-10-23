# player-progression Specification

## Purpose

Defines shared player progression during a match, including experience rewards, level-based stat growth, skill-point spending, and the HUD that makes progression visible and actionable.

## Requirements

### Requirement: Award Kill Experience to Nearby Players
The system SHALL award the same fixed experience reward to every living player tank within 500 world units of a minion or player-tank death, regardless of team or damage dealt. A minion kill SHALL award 10 experience and a player-tank kill SHALL award 50 experience.

#### Scenario: Nearby players share a minion reward
- **WHEN** a minion dies and multiple living player tanks are within 500 world units of its death position
- **THEN** each of those tanks receives 10 experience, independent of team and damage dealt

#### Scenario: Nearby players share a player reward
- **WHEN** a player tank dies and multiple living player tanks are within 500 world units of its death position
- **THEN** each of those tanks receives 50 experience, independent of team and damage dealt

#### Scenario: Player is outside the reward radius
- **WHEN** a minion or player tank dies more than 500 world units from a living player tank
- **THEN** that tank receives no experience for that death

### Requirement: Level Players Through Increasing Experience Thresholds
Each player SHALL start at level 1 with zero experience toward the next level and zero skill points. The experience required to advance from level N SHALL be 100 multiplied by N. On each level-up, the player SHALL gain exactly one skill point; excess experience SHALL carry toward the next level and SHALL allow multiple level-ups from one reward.

#### Scenario: Player reaches the first level threshold
- **WHEN** a level-1 player earns 100 experience
- **THEN** the player advances to level 2, has zero experience toward the next level, and gains one skill point

#### Scenario: Later levels require more experience
- **WHEN** a level-2 player earns 200 experience
- **THEN** the player advances to level 3 and gains one additional skill point

#### Scenario: Excess experience advances multiple levels
- **WHEN** a player earns enough experience to cross more than one level threshold
- **THEN** the player advances for every crossed threshold, receives one skill point per level gained, and retains any experience left toward the next level

### Requirement: Improve Combat Stats With Each Level
Each level above level 1 SHALL add 5 to the player's role-based maximum HP and 0.5 to the player's role-based fire damage. These bonuses SHALL be derived from the selected role's base stats, persist through death and respawn, and SHALL NOT be compounded by repeatedly applying role or level setup.

#### Scenario: Level-up improves HP and damage
- **WHEN** a player advances from level 1 to level 2
- **THEN** the player's maximum HP is 5 above the role base and fire damage is 0.5 above the role base

#### Scenario: Respawn preserves progression stats
- **WHEN** a leveled player respawns
- **THEN** the player returns with full current maximum HP and retains the role-based level bonuses to maximum HP and fire damage

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

### Requirement: Display Level After Player Names
The frontend SHALL append the player's current server-authoritative level immediately after their actual display name in the above-tank name label, using the exact format `(Lvl N)`. This SHALL apply to both the local player and other players while preserving the existing distinction of the local player's label.

#### Scenario: Display a level-2 player
- **WHEN** a visible player's display name is Alex and their level is 2
- **THEN** their above-tank label includes `Alex (Lvl 2)`

#### Scenario: Name label updates on level-up
- **WHEN** a visible player's synchronized level changes from 2 to 3
- **THEN** the above-tank label updates from `(Lvl 2)` to `(Lvl 3)` without replacing their actual name
