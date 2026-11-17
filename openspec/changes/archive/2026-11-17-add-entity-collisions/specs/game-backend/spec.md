# Spec Delta

## MODIFIED Requirements

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, using a single shared lane path definition (per lane: a diagonal-straight-diagonal path for the two outer lanes, a straight path for the middle lane) that is also used to place lane towers and derive the visually rendered streets, so minion movement, tower placement, and street rendering never diverge. Living minions SHALL contribute shared team vision. Minions SHALL hold position to automatically engage team-visible enemies within fire range instead of advancing toward their waypoint, and resume their lane path when no visible enemy remains in range. Advancing minions SHALL locally avoid living minions, living lane towers, and living main bases without overlapping them, while remaining able to pass through player tanks. Detours SHALL preserve the shared lane path as the objective rather than modify tower positions or rendered streets. Wave spawning SHALL use clear positions near the owning base rather than overlapping the base or other minions.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at clear positions near each base and sets their initial waypoints along the shared lane path definition
- **AND** those living minions begin contributing vision using their configured absolute sight ranges

#### Scenario: Lane path reused for towers
- **WHEN** a match transitions to the "started" phase and lane towers are placed
- **THEN** tower checkpoints and their existing grass-side pair offsets are computed from the same lane path definition used for minion waypoints, without moving towers onto the road or changing minion waypoints

#### Scenario: Minion encounters an enemy
- **WHEN** a minion has a team-visible enemy-team unit within its fire range
- **THEN** the minion stops advancing toward its waypoint and targets and fires at that enemy for as long as a visible enemy remains in range

#### Scenario: Minion loses its target
- **WHEN** a minion no longer has any team-visible enemy-team unit within its fire range because enemies died, left range, became concealed, or were destroyed
- **THEN** the minion resumes moving toward its waypoint along the shared lane path, avoiding blocking entities on the way

#### Scenario: Minion clears an obstacle
- **WHEN** a minion has detoured around a living structure or another living minion
- **THEN** it continues toward the same lane objective without skipping remaining lane segments

### Requirement: Position Tanks Near Team Base
The backend SHALL place a tank at a randomized collision-safe position near its own team's base, close enough to be clearly associated with that base, but outside the base structure itself, both when the tank first spawns on joining a started match and whenever it respawns after dying. The backend SHALL NOT place a tank at a map-wide random position unrelated to its team, nor exactly on top of its base's coordinates. At activation, its collision footprint SHALL be clear of living player tanks, living lane towers, and living main bases, with minions and inactive players excluded as blockers. A still-valid preselected respawn position SHALL be preserved; an occupied position SHALL be replaced with a nearby clear position, or activation SHALL wait if none is available.

#### Scenario: Initial spawn near own base
- **WHEN** a player's tank is created for a match
- **THEN** the server assigns it a collision-safe starting position near its team's base rather than an arbitrary point elsewhere on the map

#### Scenario: Respawn near own base, not inside it
- **WHEN** a dead tank's respawn delay has elapsed
- **THEN** the server restores the tank to full HP at a randomized collision-safe position near its team's base that is offset from the base's exact coordinates, so the tank does not reappear inside the main tower

#### Scenario: Previously selected respawn position remains clear
- **WHEN** a tank is ready to respawn and its preselected team-base position is still collision-safe
- **THEN** the tank becomes active at that position without another relocation

#### Scenario: Nearby spawn space is occupied
- **WHEN** all eligible nearby team-base positions are blocked by living player tanks or structures
- **THEN** the tank remains inactive and the server retries placement rather than activating it inside a blocker
