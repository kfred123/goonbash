# Spec Delta

## MODIFIED Requirements

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
