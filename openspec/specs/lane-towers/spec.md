## Purpose

Lane towers are team-owned defensive structures placed along each lane that automatically attack approaching enemies, giving each lane intermediate objectives and map-control checkpoints between the two bases.

## Requirements

### Requirement: Tower Placement Per Lane
The system SHALL place exactly 4 towers per team on each of the 3 lanes (24 towers total), grouped into two same-team pairs per team per lane. Each pair SHALL replace one previous centerline tower: its midpoint SHALL remain at 20% or 40% of that lane's path length measured from the owning team's base. The two members SHALL stand at equal distances on opposite sides of the road along the perpendicular to the local lane direction. Both complete tower footprints SHALL stand on grass with positive clearance from every rendered road, including its border, and remain inside the world bounds. Each tower SHALL have a distinct identity and independently participate in existing combat, visibility, damage, and ruin behavior without changing its individual stats.

#### Scenario: Match start tower placement
- **WHEN** a match transitions to the "started" phase
- **THEN** the server creates 4 blue towers and 4 red towers on each of the 3 lanes, for 24 independently identified towers total
- **AND** each team's towers form two roadside pairs whose midpoints are at 20% and 40% of the lane path measured from that team's base

#### Scenario: Pair members face each other across a diagonal or straight road
- **WHEN** towers are placed at any existing checkpoint on an outer or middle lane
- **THEN** the two same-team tower centers have equal and opposite perpendicular offsets from that checkpoint
- **AND** their complete scaled structure footprints remain on grass beyond the rendered road border, inside world bounds, without overlapping any lane's road
- **AND** no tower structure remains at the checkpoint's road-center position

#### Scenario: Both members are independent structures
- **WHEN** one tower in a pair is destroyed while its partner remains alive
- **THEN** only the destroyed tower stops attacking and becomes a nonfunctional ruin at its grass position
- **AND** the surviving partner retains its own HP and continues normal targeting and firing

#### Scenario: Grass placement uses existing vision rules
- **WHEN** a roadside tower observes enemies from its grass position
- **THEN** its existing sight range and grass-related vision costs and observer penalty apply without an exemption
- **AND** an ally can supply current team vision for that tower's normal attacks within its unchanged firing range

### Requirement: Tower Auto-Attack
A tower SHALL automatically detect and attack the nearest living enemy tank, minion, or opposing tower within its fire range that is currently visible to its team, on a fixed cooldown, the same way bases and minions engage visible enemies. It SHALL require current team visibility for each new shot, including vision supplied by another allied observer. Neither the visual redesign nor fog of war SHALL change its existing fire range, cooldown, or damage.

#### Scenario: Enemy minion enters tower range
- **WHEN** a team-visible enemy minion moves within a tower's fire range and the tower is not on cooldown
- **THEN** the tower fires at that minion and begins its fire cooldown

#### Scenario: No enemy in range
- **WHEN** no team-visible enemy entity is within a tower's fire range
- **THEN** the tower does not fire

#### Scenario: Tower appearance is updated
- **WHEN** a lane tower uses the outpost visual design
- **THEN** its existing fire range, cooldown, and damage remain unchanged

#### Scenario: Hidden enemy is inside firing range
- **WHEN** an enemy inside the tower's fire range is concealed by terrain and no ally reveals it
- **THEN** the tower does not acquire or fire at that enemy

### Requirement: Tower Destruction
A tower SHALL track hit points and take damage from enemy fire. When its hit points reach zero, it SHALL stop attacking, SHALL no longer be a valid attack target, and SHALL remain in the game state as a nonfunctional ruin until the match ends.

#### Scenario: Tower reduced to zero HP
- **WHEN** a tower's hit points reach zero
- **THEN** the tower stops attacking and is no longer a valid attack target
- **AND** it remains in the game state as a ruin until the match ends
