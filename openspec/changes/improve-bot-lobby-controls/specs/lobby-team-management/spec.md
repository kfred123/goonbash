# Spec Delta

## MODIFIED Requirements

### Requirement: Change team before match start
The system SHALL allow a not-ready human player in a waiting lobby to change their own team between red and blue. Human self-service requests SHALL reject another participant's team, invalid team values, changes by ready players, and changes during countdown or after match start. Host-authorized bot team changes SHALL use the separate bot-management behavior and SHALL NOT grant authority to move another human.

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

## ADDED Requirements

### Requirement: Host changes a waiting computer player's team
The system SHALL allow only the current human host to assign an existing bot to red or blue while waiting, regardless of host or bot readiness. It SHALL preserve the bot's identity, name, role, difficulty, and readiness, synchronize its team and match-statistics team, and leave occupied seats and human connections unchanged. Requests targeting humans, missing bots, invalid values, or other phases SHALL be rejected with a visible lobby error.

#### Scenario: Host moves a ready bot
- **WHEN** the current human host requests moving an existing ready red bot to blue while waiting
- **THEN** the bot and its match-statistics entry are assigned to blue
- **AND** all clients receive the new team without bot replacement or changes to identity, name, role, difficulty, or readiness
- **AND** lobby occupancy and human connection counts remain unchanged
- **AND** the same operation works from blue to red even if the host is ready

#### Scenario: Bot is already on the requested team
- **WHEN** the host submits a valid waiting-lobby request for a bot's current team
- **THEN** the request leaves the roster and participant counts unchanged without duplicating or replacing the bot

#### Scenario: Invalid or unauthorized request
- **WHEN** a non-host or former host requests a bot team change, or the request has an invalid team, malformed bot identifier, missing bot, or human target
- **THEN** the server rejects it through the lobby error channel
- **AND** roster, statistics, readiness, and counts remain unchanged

#### Scenario: Request arrives after the waiting phase
- **WHEN** a bot team-change request arrives during countdown, gameplay, or match results
- **THEN** the server rejects it without changing teams, statistics, or the current phase

#### Scenario: Later human join uses the updated roster
- **WHEN** a bot has moved teams and a human subsequently joins the waiting lobby
- **THEN** the normal team-balancing decision includes the bot in its new team
