# Spec Delta

## ADDED Requirements

### Requirement: Host manages computer players while waiting
The system SHALL allow only the current human host to add or remove computer players while the lobby is waiting. The host SHALL choose each bot's team, role, and difficulty. Bot changes SHALL be rejected during countdown and after match start.

#### Scenario: Host adds a computer player
- **WHEN** the human host adds a bot to a team with a valid role and difficulty while waiting
- **THEN** the bot appears in the synchronized lobby roster with its selected team, role, and difficulty

#### Scenario: Non-host or late bot-management request
- **WHEN** a non-host requests a bot change, or any participant requests one outside the waiting phase
- **THEN** the system rejects the request without changing the roster

#### Scenario: Host removes a waiting bot
- **WHEN** the host removes a bot while the lobby is waiting
- **THEN** the bot is removed from the roster and its seat becomes available

### Requirement: Computer players occupy ready lobby seats
The system SHALL count each bot toward lobby capacity and team balance, and SHALL consider bots ready by default. Bots SHALL NOT count as connected human clients.

#### Scenario: Bot occupies the final lobby seat
- **WHEN** the host adds a bot to the last available seat
- **THEN** the lobby becomes full and rejects additional human joins until a seat is freed

#### Scenario: Host starts with ready humans and bots
- **WHEN** every human participant is ready and the lobby contains bots
- **THEN** the bots' default readiness does not prevent the host from starting the match

#### Scenario: Human team assignment balances against bots
- **WHEN** a human joins a waiting lobby after bots have been assigned to teams
- **THEN** the team-balancing decision includes those bots in each team's member count

### Requirement: Bots cannot hold lobby host authority
Only a connected human participant SHALL hold lobby host authority. Host succession SHALL select a remaining human and SHALL never select a bot.

#### Scenario: Host leaves while a bot and human remain
- **WHEN** the host leaves and the lobby contains at least one other connected human and one or more bots
- **THEN** host authority transfers to a remaining human participant

#### Scenario: No connected human remains
- **WHEN** every human participant has left a waiting lobby, even if bots remain
- **THEN** bots do not keep the lobby active or retain host authority
