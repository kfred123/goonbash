# Spec Delta

## MODIFIED Requirements

### Requirement: Change team before match start
The system SHALL allow a not-ready player in a waiting lobby to change their own team between red and blue. It SHALL reject requests for another player's team, invalid team values, changes by ready players, and changes during countdown or after match start.

#### Scenario: Player switches teams while waiting
- **WHEN** a not-ready player selects the blue team while the lobby is waiting
- **THEN** the system assigns that player to blue
- **AND** synchronizes the updated roster to all lobby participants

#### Scenario: Player attempts to switch after start
- **WHEN** a player requests a team change after the match has started
- **THEN** the system leaves the team assignments unchanged

#### Scenario: Ready player attempts to switch teams
- **WHEN** a ready player requests a team change while waiting
- **THEN** the system rejects the request and leaves their team unchanged

#### Scenario: Player attempts to switch during countdown
- **WHEN** any player requests a team change during countdown
- **THEN** the system rejects the request and leaves all team assignments unchanged

### Requirement: Restrict lobby management to its creator
The system SHALL designate the first player to join a lobby as its host. Only that host SHALL be authorized to request match start while waiting, subject to all-player readiness. No participant SHALL be authorized to rename the lobby. If the host leaves or disconnects while others remain, the system SHALL designate a remaining participant as host. The system SHALL delete a lobby with no active players in waiting, countdown, started, or ended phases.

#### Scenario: Non-host attempts a host action
- **WHEN** a non-host player requests a lobby rename or match start
- **THEN** the system leaves the lobby name and match phase unchanged

#### Scenario: Host leaves while other players remain
- **WHEN** the host leaves or disconnects and at least one other player is still in the lobby
- **THEN** the system designates one of the remaining players as the new host
- **AND** synchronizes the new host assignment to all lobby participants
- **AND** the new host gains authorization to request match start while waiting and everyone is ready
- **AND** neither the old nor new host gains permission to rename the lobby

#### Scenario: Last active player leaves a waiting lobby
- **WHEN** the only remaining player in a waiting lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list

#### Scenario: Last active player leaves a started lobby
- **WHEN** the only remaining player in a started lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list

#### Scenario: Last active player leaves a finished lobby
- **WHEN** the only remaining player leaves an ended match from its result screen or disconnects
- **THEN** the system deletes the empty lobby

#### Scenario: Last active player leaves during countdown
- **WHEN** the only remaining participant leaves or disconnects during countdown
- **THEN** the system cancels the countdown and deletes the empty lobby
- **AND** no delayed start can recreate or start that lobby

### Requirement: Start the match for all participants
The system SHALL keep a new lobby waiting until its host requests start with every current participant, including the host, ready. An accepted request SHALL begin a shared five-second countdown, not gameplay. The system SHALL transition to started and enable gameplay for all participants only after the uninterrupted countdown expires and the remaining participants are still ready.

#### Scenario: Host starts a lobby
- **WHEN** the host starts a waiting lobby in which every participant is ready
- **THEN** every connected participant receives the countdown state
- **AND** after five uninterrupted seconds every connected participant receives the started state
- **AND** the system begins normal gameplay simulation exactly once

#### Scenario: Host attempts to start before everyone is ready
- **WHEN** the host requests start while any participant, including the host, is not ready
- **THEN** the system rejects the request, stays waiting, and does not schedule a countdown

#### Scenario: Repeated start requests during countdown
- **WHEN** the host sends additional start requests during an active countdown
- **THEN** the active countdown is neither restarted nor duplicated
- **AND** gameplay initialization still occurs at most once

## REMOVED Requirements

### Requirement: Rename a waiting lobby
**Reason**: Game names must be entered during creation and remain immutable.
**Migration**: Supply the desired name when creating the game. Remove rename controls and messages; attempts to use the old rename operation must not change the name.

## ADDED Requirements

### Requirement: Require an immutable creation-time game name
The system SHALL require a string name whose trimmed value contains 1 to 48 characters when creating a lobby. It SHALL store and publish the trimmed value without substituting a default. Invalid creation requests SHALL return an actionable validation error and create no lobby. The accepted name SHALL remain immutable for the lobby's lifetime.

#### Scenario: Named lobby creation succeeds
- **WHEN** a creation request supplies a valid name with surrounding whitespace
- **THEN** the created lobby uses the trimmed name in both lobby listings and synchronized room state

#### Scenario: Invalid creation request
- **WHEN** a creation request omits the name or supplies a non-string, blank, or over-48-character trimmed value
- **THEN** the service returns a validation error and creates no lobby

#### Scenario: Host attempts a legacy rename
- **WHEN** the host sends a rename request at any time after creation
- **THEN** neither the synchronized name nor the listed name changes

### Requirement: Synchronize participant readiness
The system SHALL initialize each joining participant as not ready and synchronize readiness to all lobby participants. While waiting, each participant SHALL be able to set only their own readiness to a boolean value, including returning to not ready. Readiness changes during countdown or gameplay, malformed values, and changes targeting another participant SHALL be rejected without changing state.

#### Scenario: Participant joins while others are ready
- **WHEN** a new participant joins a waiting lobby whose existing participants are ready
- **THEN** the newcomer is not ready and the existing participants retain their readiness
- **AND** host start is unavailable until the newcomer becomes ready

#### Scenario: Participant toggles readiness
- **WHEN** a participant requests a valid change to their own readiness while waiting
- **THEN** all participants receive the updated readiness
- **AND** setting not ready allows that participant to change team or role again

#### Scenario: Invalid or cross-player readiness request
- **WHEN** a participant sends a malformed readiness value or attempts to change another participant's readiness
- **THEN** the system rejects the request without modifying any readiness

#### Scenario: Readiness change during countdown or gameplay
- **WHEN** a participant requests a readiness change during countdown, started, or ended phase
- **THEN** the system rejects the request and keeps readiness unchanged

### Requirement: Cancel countdown when a participant leaves
The system SHALL cancel an active countdown if any participant leaves or disconnects before match start, clear its pending start, return remaining participants to waiting, and synchronize the cancellation reason. Remaining participants SHALL retain readiness. Host succession SHALL still apply, and a new countdown SHALL require another explicit host start request.

#### Scenario: Non-host disconnects during countdown
- **WHEN** a non-host participant disconnects before the countdown expires
- **THEN** the system removes them, cancels the pending start, and returns the room to waiting
- **AND** remaining participants retain readiness and receive a player-left cancellation reason
- **AND** the previous deadline cannot start gameplay

#### Scenario: Host leaves during countdown
- **WHEN** the host leaves before countdown completion and participants remain
- **THEN** the system cancels the countdown and chooses a remaining participant as host
- **AND** the new host must explicitly request a new countdown when all remaining participants are ready

### Requirement: Reject new joins during countdown
The system SHALL reject new room joins during countdown and SHALL NOT advertise counting-down lobbies as joinable. Cancellation SHALL restore availability subject to existing capacity rules. Join rejection SHALL NOT change the roster, readiness, player count, or countdown.

#### Scenario: Stale lobby listing is used
- **WHEN** a player attempts to join a lobby that began countdown after their last listing refresh
- **THEN** the service rejects the join with an unavailable-lobby error
- **AND** the existing countdown and participants remain unchanged

#### Scenario: Countdown cancellation restores availability
- **WHEN** a countdown is cancelled and the waiting lobby has free capacity
- **THEN** the lobby becomes joinable and appears as available again
- **AND** a subsequent new participant joins as not ready
