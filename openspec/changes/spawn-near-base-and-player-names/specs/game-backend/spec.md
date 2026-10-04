# Spec Delta

## ADDED Requirements

### Requirement: Position Tanks Near Team Base
The backend SHALL place a tank at a randomized position near its own team's base — close enough to be clearly associated with that base, but outside the base structure itself — both when the tank first spawns on joining a started match and whenever it respawns after dying. The backend SHALL NOT place a tank at a map-wide random position unrelated to its team, nor exactly on top of its base's coordinates.

#### Scenario: Initial spawn near own base
- **WHEN** a player's tank is created for a match
- **THEN** the server assigns it a starting position near its team's base rather than an arbitrary point elsewhere on the map

#### Scenario: Respawn near own base, not inside it
- **WHEN** a dead tank's respawn delay has elapsed
- **THEN** the server restores the tank to full HP at a randomized position near its team's base that is offset from the base's exact coordinates, so the tank does not reappear inside the main tower
