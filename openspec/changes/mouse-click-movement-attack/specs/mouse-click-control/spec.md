## ADDED Requirements

### Requirement: Click-to-Move
A player tank SHALL move toward a point on the game field that the player clicks, provided the click did not land on an enemy unit.

#### Scenario: Player clicks empty ground
- **WHEN** the player left-clicks a point on the game field that is not occupied by an enemy tank or minion
- **THEN** the tank clears any locked attack target and begins moving in a straight line toward that point at its normal speed

#### Scenario: Tank arrives at the commanded point
- **WHEN** a moving tank reaches its commanded destination point
- **THEN** the tank stops moving and has no move destination or attack target

### Requirement: Click-to-Attack with Target Lock
A player tank SHALL attack an enemy the player clicks (tank, minion, or enemy base), closing distance first if the enemy is out of firing range, and SHALL keep the same enemy locked as its target until the player issues a new command or the target is no longer valid.

#### Scenario: Player clicks an enemy that is already in range
- **WHEN** the player left-clicks an enemy tank, minion, or enemy base that is within the clicking tank's fire range
- **THEN** the tank locks onto that enemy as its target and stops moving, and its existing fire-cooldown/projectile logic fires at that specific locked target on cooldown

#### Scenario: Player clicks an enemy that is out of range
- **WHEN** the player left-clicks an enemy tank, minion, or enemy base that is farther away than the clicking tank's fire range
- **THEN** the tank locks onto that enemy and moves toward its current position each tick until it comes within fire range, at which point it stops moving and begins firing at it

#### Scenario: Locked target moves while out of range
- **WHEN** a tank has a locked target that is out of range and the target's position changes before the tank reaches firing range
- **THEN** the tank continues steering toward the target's updated position rather than its original position

#### Scenario: Lock persists across ticks until a new command
- **WHEN** a tank has a locked target and the player has not issued any new click command
- **THEN** the tank keeps pursuing/engaging the same locked target on every subsequent tick, even if a different enemy unit is closer

#### Scenario: Player clicks elsewhere to release the lock
- **WHEN** the player left-clicks empty ground or a different enemy while a tank already has a locked target
- **THEN** the previous lock is released and replaced by the new move destination or new locked target

#### Scenario: Locked target dies or becomes invalid
- **WHEN** a tank's locked target dies, respawns, or otherwise no longer exists while the tank has not issued a new command
- **THEN** the tank's lock is cleared and the tank stops (has no move destination or attack target) until the player clicks again

#### Scenario: Clicking a friendly unit has no effect
- **WHEN** the player left-clicks a friendly (same-team) tank or minion
- **THEN** no attack lock is set and the tank's current move/attack state is unchanged

### Requirement: Click Feedback Marker
The frontend SHALL display a short-lived visual marker at the location the player clicked, indicating whether the click was interpreted as a move command or an attack command, and the marker SHALL disappear automatically after about one second.

#### Scenario: Move command feedback
- **WHEN** the player clicks empty ground (a move-to-point command)
- **THEN** a green cross marker appears at the clicked point and disappears after about one second

#### Scenario: Attack command feedback
- **WHEN** the player clicks an enemy tank, enemy minion, or enemy base (an attack command)
- **THEN** a red cross marker appears centered on that enemy's current position, continues tracking the enemy's position each tick as it moves, and disappears after about one second

#### Scenario: No marker on invalid or friendly clicks
- **WHEN** the player clicks a friendly unit or the click is otherwise not translated into a move or attack command
- **THEN** no click-feedback marker is shown
