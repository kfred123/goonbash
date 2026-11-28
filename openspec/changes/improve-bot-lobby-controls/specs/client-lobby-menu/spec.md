# Spec Delta

## ADDED Requirements

### Requirement: Add computer players from their team list
The client SHALL show the waiting host a `Hinzufuegen` button in each team roster, including empty rosters. Activating it SHALL open a compact popup over the visible lobby, targeting that roster's team, with difficulty and role selection, confirmation, and cancellation. The client SHALL NOT require a separate full-screen bot setup or a second team selection.

#### Scenario: Host opens either team's popup
- **WHEN** the host activates `Hinzufuegen` in the red or blue roster while waiting
- **THEN** the popup identifies that team and offers easy, medium, and hard difficulty with medium initially selected
- **AND** the existing supported bot roles remain selectable with Damagedealer initially selected
- **AND** the lobby remains visible behind the popup, with background actions blocked while it is open

#### Scenario: Host confirms a computer player
- **WHEN** the host selects a difficulty and role and confirms adding
- **THEN** the client requests a bot with those selections in the originating team
- **AND** the popup closes and the roster shows the new bot only after server synchronization

#### Scenario: Host cancels creation
- **WHEN** the host cancels the popup or presses Escape
- **THEN** the popup closes without requesting a bot and the team rosters remain unchanged

#### Scenario: Lobby capacity is exhausted
- **WHEN** the waiting lobby has no available participant seat
- **THEN** both roster add buttons are disabled and the UI indicates that the lobby is full
- **AND** an already open popup cannot confirm another bot
- **AND** add actions become available again after a seat is freed

### Requirement: Manage computer players from their roster row
The client SHALL display separate `Team wechseln` and `Entfernen` buttons after each bot's roster details for the waiting host. Team switching SHALL request the opposite team and removal SHALL target that bot. Bot identity, role, difficulty, and readiness SHALL remain distinguishable from the controls, with all rows and actions reachable even when one team contains the full lobby roster.

#### Scenario: Host switches a computer player's team
- **WHEN** the host activates a red bot's `Team wechseln` button
- **THEN** the client requests moving that bot to blue
- **AND** after server acceptance every client displays it exactly once in the blue roster with unchanged role, difficulty, and readiness
- **AND** switching a blue bot follows the same behavior toward red

#### Scenario: Host removes a computer player
- **WHEN** the host activates a bot's `Entfernen` button
- **THEN** the client requests removal of that bot
- **AND** after server acceptance the bot disappears and the occupied participant count decreases

#### Scenario: Full roster remains usable
- **WHEN** all available lobby seats are occupied by participants assigned to one team
- **THEN** every participant and each available bot action can be reached without overlapping text, neighboring rows, or other lobby controls

### Requirement: Keep bot controls consistent with current authority
The client SHALL expose bot management only to the current human host while waiting, independently of that host's own readiness. Human rows SHALL NOT receive bot actions. Losing authority, leaving, or a phase change SHALL close the popup and remove bot actions. Bot action failures SHALL be visible and SHALL NOT be shown as confirmed roster changes.

#### Scenario: Non-host or human row
- **WHEN** a non-host views the lobby or the host views a human participant's row
- **THEN** the non-host sees no bot management controls
- **AND** the human row has no bot team-switch or removal buttons

#### Scenario: Ready host manages bots
- **WHEN** the human host is ready and the lobby is still waiting
- **THEN** bot management remains available while the host's own team and role choices remain locked

#### Scenario: Popup becomes unauthorized
- **WHEN** host authority is lost, the lobby leaves waiting, or the local player leaves while the popup is open
- **THEN** the popup is discarded and cannot submit a bot request
- **AND** no stale bot buttons remain usable

#### Scenario: Server rejects an action
- **WHEN** the server rejects adding, switching, or removing a bot, including a capacity race
- **THEN** the client displays the rejection in the lobby
- **AND** the server-confirmed roster remains visible without a fabricated success
