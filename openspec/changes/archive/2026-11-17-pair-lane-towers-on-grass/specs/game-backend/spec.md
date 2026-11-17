# Spec Delta

## MODIFIED Requirements

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, using a single shared lane path definition (per lane: a diagonal-straight-diagonal path for the two outer lanes, a straight path for the middle lane) that is also used to derive roadside tower-pair checkpoints and the visually rendered streets. Tower-pair midpoints SHALL follow that lane path, with individual towers offset onto grass on opposite sides rather than positioned on the road; minion waypoints and street geometry SHALL remain unchanged. Living minions SHALL contribute shared team vision. Minions SHALL hold position to automatically engage team-visible enemies within fire range instead of advancing toward their waypoint, and resume their lane path when no visible enemy remains in range.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints along the shared lane path definition
- **AND** those living minions begin contributing vision using their configured absolute sight ranges

#### Scenario: Lane path reused for towers
- **WHEN** a match transitions to the "started" phase and lane towers are placed
- **THEN** each tower-pair midpoint is computed from the same lane path definition used for minion waypoints
- **AND** its members are placed on opposite grass verges with their full structure footprints clear of the road and its border, without changing the minion path or rendered street

#### Scenario: Minion encounters an enemy
- **WHEN** a minion has a team-visible enemy-team unit within its fire range
- **THEN** the minion stops advancing toward its waypoint and targets and fires at that enemy for as long as a visible enemy remains in range

#### Scenario: Minion loses its target
- **WHEN** a minion no longer has any team-visible enemy-team unit within its fire range because enemies died, left range, became concealed, or were destroyed
- **THEN** the minion resumes moving toward its waypoint along the shared lane path
