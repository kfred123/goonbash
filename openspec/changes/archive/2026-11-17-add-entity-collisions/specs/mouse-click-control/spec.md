# Spec Delta

## MODIFIED Requirements

### Requirement: Click-to-Move
A living player tank SHALL move toward a point on the game field that the player clicks, provided the click lands on empty ground rather than a unit or structure. Friendly-unit clicks SHALL leave current commands unchanged. Movement SHALL respect living player, lane-tower, and main-base collision footprints while ignoring minions as blockers. Contact SHALL stop or slide the tank without pushing other players. A blocked destination SHALL remain pending until reached or replaced by another command; contact alone SHALL NOT count as arrival. Automatic route planning around obstacles is not required for players.

#### Scenario: Player clicks empty ground
- **WHEN** the player left-clicks empty ground that is not occupied by a unit or structure
- **THEN** the tank clears any locked attack target and begins moving directly toward that point at its normal role-specific speed, subject to collision constraints and world bounds

#### Scenario: Tank arrives at the commanded point
- **WHEN** a moving tank reaches its commanded destination point
- **THEN** the tank stops moving and has no move destination or locked attack target, while passive engagement remains available

#### Scenario: Route is temporarily blocked by a player
- **WHEN** another living player blocks movement toward the destination
- **THEN** the tank stops or slides without crossing or pushing that player and retains its move destination
- **AND** movement continues when the route becomes clear

#### Scenario: Destination cannot be reached through a structure
- **WHEN** a move command would take the tank through a living lane tower or main base
- **THEN** the tank cannot enter the structure's collision footprint and does not report arrival merely because it touched the obstacle

### Requirement: Click-to-Attack with Target Lock
A living player tank SHALL attack a team-visible enemy the player clicks (tank, minion, lane tower, or enemy base), closing distance first if the enemy is out of firing range, and SHALL keep the same enemy locked as its target until the player issues a new command or the target is no longer valid or team-visible. Hidden enemies SHALL NOT participate in click hit testing; clicking their concealed position SHALL behave like clicking ground unless another visible object occupies it. Pursuit SHALL obey the same collision constraints as move-to-point commands. A temporarily blocked route SHALL NOT clear an otherwise valid lock or allow passage through the blocker.

#### Scenario: Player clicks an enemy that is already in range
- **WHEN** the player left-clicks a team-visible enemy tank, minion, lane tower, or enemy base within the clicking tank's fire range
- **THEN** the tank locks onto that enemy and stops moving, and its existing fire-cooldown/projectile logic fires at that specific locked target on cooldown

#### Scenario: Player clicks an enemy that is out of range
- **WHEN** the player left-clicks a team-visible enemy tank, minion, lane tower, or enemy base farther away than the clicking tank's fire range
- **THEN** the tank locks onto that enemy and moves toward its current position each tick subject to collision constraints until within fire range, then stops moving and begins firing, provided the target remains team-visible

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

#### Scenario: Pursuit route is blocked
- **WHEN** a living player or structure blocks the route to a valid team-visible locked target outside fire range
- **THEN** the tank remains outside the blocker's collision footprint and keeps the same target lock
- **AND** it resumes pursuit when space becomes available or fires if that target enters range
