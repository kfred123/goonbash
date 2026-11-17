# Spec Delta

## MODIFIED Requirements

### Requirement: Create a game lobby
The client SHALL require the player to enter a game name before creating a lobby and entering its waiting state. The trimmed name MUST contain 1 to 48 characters. Invalid input SHALL display a validation message without creating a lobby.

#### Scenario: Player creates a game
- **WHEN** the player activates `Create Game`, enters a valid name, and confirms creation
- **THEN** the backend creates a new lobby and room with the trimmed name
- **AND** the client joins that room
- **AND** the client displays the waiting lobby with its name and current player count

#### Scenario: Player submits an invalid name
- **WHEN** the player submits an empty, whitespace-only, or over-48-character trimmed name
- **THEN** the client displays a validation message and does not create a lobby
- **AND** the player can correct the input

#### Scenario: Player cancels creation
- **WHEN** the player cancels name entry
- **THEN** no lobby is created and the available-lobbies screen remains accessible

### Requirement: Wait for players in a lobby
The client SHALL show the waiting lobby after creation or join until the countdown completes. It SHALL show the immutable lobby name and two clearly separated Team Red and Team Blue rosters, with each participant's name, selected role (Healer, Tank, or Damagedealer), and readiness. Team and role controls SHALL be available only to the local not-ready player while waiting. Only the host SHALL see the start control; no player SHALL see rename controls.

#### Scenario: Additional player joins
- **WHEN** another player joins the waiting lobby
- **THEN** the player count and team roster update for all clients in that lobby
- **AND** the new participant's name and selected role are shown in their team panel
- **AND** the new participant is shown as not ready

#### Scenario: Player changes team
- **WHEN** the local not-ready player selects the other team while waiting
- **THEN** the client sends the team-change request
- **AND** displays the synchronized team roster, including each participant's name and selected role, returned by the server

#### Scenario: Host manages the waiting lobby
- **WHEN** the local player is the lobby host
- **THEN** the client shows the start control, enabled only when every participant including the host is ready
- **AND** it hides the start control from non-host players
- **AND** it shows no rename controls to any participant

#### Scenario: Host starts the game
- **WHEN** the server synchronizes that the countdown has completed and the match has started
- **THEN** the client removes the waiting-lobby controls
- **AND** displays the gameplay state

#### Scenario: Player changes role
- **WHEN** the local not-ready player selects a role (Healer, Tank, or Damagedealer) while waiting
- **THEN** the client sends the role-change request
- **AND** displays the synchronized role roster returned by the server

#### Scenario: Roster shows each participant's role
- **WHEN** the waiting lobby roster is displayed
- **THEN** each participant's currently selected role is shown alongside their name in their team panel

#### Scenario: Team rosters remain distinct
- **WHEN** the lobby has participants on either or both teams
- **THEN** two separately bounded and labeled Team Red and Team Blue lists are visible
- **AND** each participant appears exactly once in their assigned team
- **AND** an empty team retains its visible panel and empty-state indication

## ADDED Requirements

### Requirement: Display and control readiness
The client SHALL provide a local readiness toggle while waiting and show a green checkmark with an accessible ready label for each ready participant in their team list. A ready local player SHALL have disabled team and role controls until they become not ready again. Pending or rejected changes SHALL NOT appear as confirmed server state.

#### Scenario: Player becomes ready
- **WHEN** the local player selects `Bereit` and the server accepts it
- **THEN** every participant sees the player's green checkmark and ready label
- **AND** the local team and role controls are disabled
- **AND** the readiness control allows returning to not ready while waiting

#### Scenario: Player becomes not ready
- **WHEN** the server accepts the local player's request to become not ready
- **THEN** every participant sees that player's ready checkmark removed
- **AND** the local team and role controls become available
- **AND** the host start control is disabled

### Requirement: Present shared start countdown
The client SHALL show every participant the same server-derived countdown from 5 to 1 before gameplay. During countdown, team, role, readiness, and start controls SHALL be disabled and no rename control SHALL exist. Leaving the lobby SHALL remain possible. Countdown cancellation SHALL restore the waiting view with an explicit cancellation message; the client MUST NOT start gameplay based on its own timer.

#### Scenario: Countdown begins
- **WHEN** the server accepts the all-ready host's start request
- **THEN** every participant sees the countdown begin at 5 and progress toward match start
- **AND** all lobby configuration and readiness controls are locked
- **AND** gameplay remains hidden until the server reports the started phase

#### Scenario: Participant leaves during countdown
- **WHEN** the server cancels the countdown after any participant leaves or disconnects
- **THEN** remaining clients remove the countdown and show that it was cancelled because a player left
- **AND** the waiting rosters and remaining participants' readiness are displayed
- **AND** ready players remain team/role locked until they choose not ready
- **AND** the host must explicitly start a new countdown

#### Scenario: Selected lobby begins its countdown before joining
- **WHEN** the player's join request is rejected because the selected lobby is counting down
- **THEN** the client shows an actionable unavailable-lobby error and permits refreshing the lobby list
