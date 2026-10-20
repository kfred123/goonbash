## MODIFIED Requirements

### Requirement: State Broadcasting
The server SHALL transmit visibility-scoped state to each connected client at the fixed patch interval, while retaining canonical simulation state exclusively on the server. No snapshot or delta SHALL bypass the receiving connection's current visibility projection.

#### Scenario: Broadcasting state
- **WHEN** the server state broadcast timer triggers
- **THEN** each client receives only allowed entity state and redacted references for its current team, rather than canonical room state

## ADDED Requirements

### Requirement: Visibility Scoped State Replication
The server SHALL keep the complete canonical simulation private and transmit a connection-specific allowed state in both initial snapshots and subsequent updates. The receiving team SHALL be determined from the server's current player membership, not client-supplied team claims. Allied entities SHALL remain available. Enemy living tanks/minions, enemy structures including ruins, and hostile projectiles SHALL be included only when their current centers are team-visible; allied projectiles SHALL remain available. A connection without a recognized current team SHALL receive no spatial entities.

#### Scenario: Initial state for opposing teams
- **WHEN** opposing clients join a started match with enemies outside team vision
- **THEN** each decoded initial state contains its allied observers and currently visible enemies only, with concealed enemies absent from spatial entity collections

#### Scenario: Revealed enemy loses sight
- **WHEN** the last allied observer leaves or dies while a previously visible enemy remains alive
- **THEN** the next outgoing update removes that enemy from the receiving client's state without sending its new concealed position or combat state

#### Scenario: Unchanged structure is revealed again
- **WHEN** an allied observer moves into sight of an enemy tower or base that has not itself changed
- **THEN** the next outgoing update adds the currently visible structure with its current allowed presentation data

#### Scenario: Hidden entity changes
- **WHEN** a concealed enemy moves, changes HP, fires, activates an ability or respawns outside sight
- **THEN** those entity updates are not encoded into the receiving client's initial state or deltas

#### Scenario: Team membership changes or connection rejoins
- **WHEN** server-authorized team membership changes or a player establishes a fresh connection
- **THEN** outgoing state is reevaluated for that connection without retaining the former team's unauthorized spatial entries

### Requirement: Redacted References and Private Intent
Outgoing entity data SHALL NOT contain references to concealed entities through current target, locked target, projectile owner or projectile target fields. Only the controlling player SHALL receive their movement destination and attack-lock intent. Other players' private movement goals, minion waypoints, XP and ability cooldown details SHALL NOT be copied from canonical state. Public roster identity/team/role, visible presentation and public scoreboards SHALL remain available.

#### Scenario: Allied projectile pursues a hidden target
- **WHEN** an allied in-flight projectile continues toward a living target that is no longer visible
- **THEN** canonical tracking and damage continue but outgoing projectile target metadata does not name the concealed target

#### Scenario: Visible enemy moves toward an unseen destination
- **WHEN** an enemy is currently visible but has a movement destination in concealed terrain
- **THEN** its visible position is replicated but its canonical movement destination and private lock intent are not

#### Scenario: Concealed ability cast has ended before revelation
- **WHEN** another player's unit is revealed after an ability effect has expired, including a zero-duration Homing Rocket cast
- **THEN** its outgoing effect timestamp is zero rather than the historical cast time, while the controlling player retains the canonical timestamp

#### Scenario: Visible effect expires
- **WHEN** a currently visible ability effect reaches its end timestamp
- **THEN** subsequent projections clear that timestamp for other players without changing the owner's state

#### Scenario: Waiting lobby and final results
- **WHEN** a client views the lobby or match results
- **THEN** public roster and scoreboard data remain available without exposing canonical lobby spawn positions or disabling spatial filtering after the match

#### Scenario: Historical knowledge
- **WHEN** an enemy was previously visible and later becomes concealed
- **THEN** the server stops transmitting its hidden state and removes it from the active view, without claiming to erase information the client already observed

#### Scenario: Guessed target identifier
- **WHEN** a client targets a missing, dead, out-of-sight nearby or out-of-sight distant entity
- **THEN** the attack or rocket rejection contains the same non-positional invalid-target reason, without revealing the target's hidden existence, life state or range
