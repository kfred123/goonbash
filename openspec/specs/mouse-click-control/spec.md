## Purpose

Defines click-to-move destinations, persistent enemy target locks and pursuit, passive fire without chasing, and visual click feedback.

## Requirements

### Requirement: Click-to-Move
A living player tank SHALL move toward a point on the game field that the player clicks, provided the click lands on empty ground rather than a unit or structure. Friendly-unit clicks SHALL leave current commands unchanged.

#### Scenario: Player clicks empty ground
- **WHEN** the player left-clicks empty ground that is not occupied by a unit or structure
- **THEN** the tank clears any locked attack target and begins moving in a straight line toward that point at its normal role-specific speed, subject to world bounds

#### Scenario: Tank arrives at the commanded point
- **WHEN** a moving tank reaches its commanded destination point
- **THEN** the tank stops moving and has no move destination or locked attack target, while passive engagement remains available

### Requirement: Click-to-Attack with Target Lock
A living player tank SHALL attack a team-visible enemy the player clicks (tank, minion, lane tower, or enemy base), closing distance first if the enemy is out of firing range, and SHALL keep the same enemy locked as its target until the player issues a new command or the target is no longer valid or team-visible. Hidden enemies SHALL NOT participate in click hit testing; clicking their concealed position SHALL behave like clicking ground unless another visible object occupies it.

#### Scenario: Player clicks an enemy that is already in range
- **WHEN** the player left-clicks a team-visible enemy tank, minion, lane tower, or enemy base within the clicking tank's fire range
- **THEN** the tank locks onto that enemy and stops moving, and its existing fire-cooldown/projectile logic fires at that specific locked target on cooldown

#### Scenario: Player clicks an enemy that is out of range
- **WHEN** the player left-clicks a team-visible enemy tank, minion, lane tower, or enemy base farther away than the clicking tank's fire range
- **THEN** the tank locks onto that enemy and moves toward its current position each tick until within fire range, then stops moving and begins firing, provided the target remains team-visible

#### Scenario: Locked target moves while out of range
- **WHEN** a tank has a team-visible locked target that is out of range and the target's position changes before the tank reaches firing range
- **THEN** the tank continues steering toward the target's updated position rather than its original position

#### Scenario: Lock persists across ticks until a new command
- **WHEN** a tank has a valid team-visible locked target and the player has not issued any new click command
- **THEN** the tank keeps pursuing or engaging that same target on subsequent ticks, even if a different enemy is closer

#### Scenario: Player clicks elsewhere to release the lock
- **WHEN** the player left-clicks empty ground or a different team-visible enemy while a tank already has a locked target
- **THEN** the previous lock is released and replaced by the new move destination or locked target

#### Scenario: Locked target dies or becomes invalid
- **WHEN** a tank's locked target dies, respawns, or otherwise no longer exists and the player has not issued a new command
- **THEN** the tank's lock is cleared and the tank stops moving with no move destination or locked attack target until the player clicks again
- **AND** passive firing at team-visible enemies already in range remains available without pursuit

#### Scenario: Clicking a friendly unit has no effect
- **WHEN** the player left-clicks a friendly tank or minion
- **THEN** no attack lock is set and the tank's current move/attack state is unchanged

#### Scenario: Locked target enters fog
- **WHEN** a locked target ceases to be visible to the tank's team
- **THEN** the lock and its pursuit are cleared before the next movement or new shot
- **AND** no last-known-position pursuit is created and passive fire considers only other visible enemies

#### Scenario: Click at a concealed enemy position
- **WHEN** a player clicks ground occupied only by an enemy hidden from their team
- **THEN** the click issues an ordinary move command rather than an attack or target-follow marker

### Requirement: Passive Auto-Engage Nearby Enemies
When a player tank has no locked attack target, it SHALL automatically fire at the nearest valid team-visible enemy already within fire range, without moving toward it. Passive engagement SHALL NOT cancel an active move-to-point command. A valid team-visible player-issued target lock SHALL always take priority.

#### Scenario: No lock, enemy already in range
- **WHEN** a player tank has no locked target and a team-visible enemy tank, minion, lane tower, or enemy base is within fire range
- **THEN** the tank automatically fires at the nearest valid team-visible enemy on cooldown without moving toward it

#### Scenario: No lock, no enemy in range
- **WHEN** a player tank has no locked target and no team-visible enemy is within fire range
- **THEN** the tank does not fire

#### Scenario: A locked target takes priority over a passively-nearby enemy
- **WHEN** a player tank has a valid team-visible locked target in or out of range and a different, closer visible enemy is also within fire range
- **THEN** the tank continues engaging only its locked target and does not switch to the closer enemy

#### Scenario: Auto-engage resumes once a lock is cleared
- **WHEN** a player tank's locked target dies, becomes invalid, or becomes concealed and the player has not issued a new command
- **THEN** the tank falls back to automatically firing at the nearest valid team-visible enemy already within fire range, if any, without chasing it

### Requirement: Click Feedback Marker
The frontend SHALL display a short-lived visual marker for accepted movement or attack clicks, disappearing automatically after about one second. An attack marker SHALL track an enemy only while that enemy remains team-visible and valid.

#### Scenario: Move command feedback
- **WHEN** the player clicks empty ground and issues a move-to-point command
- **THEN** a green cross marker appears at the clicked point and disappears after about one second

#### Scenario: Attack command feedback
- **WHEN** the player clicks a team-visible enemy tank, minion, lane tower, or base and issues an attack command
- **THEN** a red cross marker appears centered on that enemy, tracks its current visible position each tick, and disappears after about one second or sooner on visibility loss

#### Scenario: No marker on invalid or friendly clicks
- **WHEN** the player clicks a friendly unit or the click is otherwise not translated into a move or attack command
- **THEN** no click-feedback marker is shown

#### Scenario: Tracked enemy disappears
- **WHEN** a marked enemy becomes concealed or invalid before the marker expires
- **THEN** its attack marker disappears immediately rather than continuing to follow hidden coordinates
