# fog-of-war Specification

## Purpose

Define temporary shared team vision and terrain-sensitive concealment so that allied observers reveal nearby enemies while grass reduces reconnaissance range.

## Requirements

### Requirement: Independent Absolute Sight Ranges
Player tanks, minions, lane towers, and main bases SHALL have explicit sight ranges in world units. All player roles (Healer, Tank, Damagedealer) and the generic Tank schema SHALL use 325, matching lane towers and main bases. Minions SHALL use 130. These SHALL be independent absolute values, not runtime multipliers of firing range. The existing road/grass sight costs and observer-in-grass penalty SHALL apply unchanged.

#### Scenario: Role initializes
- **WHEN** a match initializes a player's role stats
- **THEN** the tank receives that role's absolute sight range

#### Scenario: Combat stats change
- **WHEN** progression or an ability changes a unit's combat stats without an explicit sight upgrade
- **THEN** its configured sight range remains unchanged

### Requirement: Shared Current Team Vision
Each team SHALL see the union of the areas revealed by its living tanks and minions and its intact lane towers and main base. Enemy visibility SHALL be determined at the enemy's center. Areas without a current allied observer SHALL be concealed again without explored-area memory or remembered hostile dots.

#### Scenario: Ally scouts an enemy
- **WHEN** an enemy is inside a living ally's vision but outside the local player's own vision
- **THEN** that enemy is visible to the local player and eligible for team-visible targeting

#### Scenario: Last observer leaves or dies
- **WHEN** no living allied observer can see a previously revealed enemy position
- **THEN** that position becomes dark and the enemy disappears from the arena and minimap on the next corresponding state update

#### Scenario: Destroyed structure and respawning player
- **WHEN** a tower or base is destroyed or a player tank is dead
- **THEN** it contributes no vision
- **AND** a respawned living tank contributes vision from its new position, without restoring old explored regions

#### Scenario: Local player is dead
- **WHEN** the local tank is awaiting respawn and allied observers remain alive
- **THEN** the local player retains their team's remaining current vision

### Requirement: Terrain Weighted Direct Sight
Visibility SHALL use the direct straight sightline from observer center to queried point. Each road world unit SHALL consume one sight-budget unit and each grass world unit SHALL consume two. An observer centered in grass SHALL additionally receive half its configured sight budget. A point SHALL be visible exactly when its total direct sightline cost is less than or equal to that budget; sight SHALL NOT bend around grass.

#### Scenario: Unobstructed road range boundary
- **WHEN** an observer with sight range 200 stands on road and its entire sightline follows road
- **THEN** a point 200 units away is visible and a point farther than 200 is not

#### Scenario: Road observer looks into grass
- **WHEN** a road observer has sight range 200 and a sightline contains 80 road units followed by grass
- **THEN** the first 60 grass units are visible and any farther point on that continuing grass ray is hidden

#### Scenario: Observer and ray are entirely in grass
- **WHEN** an observer with sight range 200 stands in grass and its entire sightline is grass
- **THEN** the point 50 units away is visible and a farther point is hidden

#### Scenario: Intervening grass conceals a road target
- **WHEN** a road target's straight sightline exceeds the observer's budget because it crosses grass
- **THEN** the target is hidden even if a longer all-road route to it exists

#### Scenario: Shared terrain boundaries
- **WHEN** vision is evaluated on a rendered lane's outer border or where lanes overlap
- **THEN** the closed visible road corridor including its border counts as road, overlaps are counted once, and all other arena ground counts as grass

### Requirement: Dark Terrain and Complete Enemy Concealment
The arena SHALL remain recognizable beneath a dark overlay outside current team vision, and revealed terrain SHALL use normal brightness. Hidden enemies SHALL have no visible sprite, cannon, name, health bar, ability decoration, muzzle flash, target marker, or selectable hit region. Allied presentation SHALL remain available subject to existing death rules. Enemy ruins SHALL appear only when their position is currently revealed and SHALL never grant vision.

#### Scenario: Hidden enemy changes state
- **WHEN** an enemy moves, fires, takes damage, or activates an ability outside team vision
- **THEN** none of its attached presentation reveals it to that team

#### Scenario: Enemy becomes visible again
- **WHEN** an enemy reenters team vision
- **THEN** its current presentation appears without replaying firing effects missed while hidden

#### Scenario: Terrain outside the camera
- **WHEN** the camera moves away from allied observers
- **THEN** fog follows world-space team vision rather than revealing the camera viewport

#### Scenario: Approximate fog edge
- **WHEN** the visual fog contour is compared with the exact visibility boundary
- **THEN** its positional error is at most 12 world units and enemy selection and concealment still use the exact rule
