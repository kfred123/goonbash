# Spec Delta

## Purpose

Defines server-controlled team participants that make gameplay decisions from the same team-visible information as human players. It also defines how a bot takes control of a participant's existing tank.

## ADDED Requirements

### Requirement: Bot decisions use only team-visible observations
The system SHALL provide each bot only allied entities and enemy entities currently visible to its team, using the same team-vision rules as human gameplay. A bot SHALL NOT choose actions from concealed enemy positions, identities, or state.

#### Scenario: Bot cannot act on a concealed enemy
- **WHEN** an enemy is outside the bot team's current vision
- **THEN** the bot's observations omit that enemy and its position
- **AND** the bot does not target or pursue the concealed enemy

#### Scenario: Allied vision reveals an enemy to a bot
- **WHEN** an enemy is visible to any observer on the bot's team
- **THEN** the bot may consider that enemy using the same team-visible information available to human teammates

### Requirement: Difficulty changes decision quality only
The system SHALL provide easy, medium, and hard bot difficulties. Difficulty SHALL affect decision-making sophistication, but SHALL NOT grant additional vision or alter the selected role's movement, health, damage, firing range, cooldowns, or ability rules.

#### Scenario: Easy bot selects a nearby visible threat
- **WHEN** an easy bot has multiple valid visible targets
- **THEN** it uses a simple nearest-visible-target policy and conservative ability use

#### Scenario: Medium bot prioritizes visible objectives
- **WHEN** a medium bot has multiple valid visible targets or available role abilities
- **THEN** it may prioritize the visible match objective and use role abilities when their normal conditions are met

#### Scenario: A threatened bot breaks pursuit
- **WHEN** a medium or hard bot is wounded and threatened by a visible enemy
- **THEN** it stops chasing and seeks a safer position behind a nearby living ally or withdraws if no suitable ally is available
- **AND** it resumes normal decisions when the threat passes

#### Scenario: Hard bot coordinates with visible teammates
- **WHEN** a hard bot evaluates a tactical action
- **THEN** it may coordinate target choice or positioning using allied and enemy information currently visible to its team

#### Scenario: Difficulty does not change combat rules
- **WHEN** bots of different difficulties use the same role
- **THEN** they use identical role statistics, sight rules, combat validation, and ability effects

### Requirement: Bots use authoritative gameplay actions
The system SHALL apply bot movement, target, and ability decisions through the same authoritative gameplay rules used for human-controlled tanks.

#### Scenario: Bot uses its role's special abilities
- **WHEN** a bot earns points and its role has both unlearned and learned abilities
- **THEN** it learns its role's abilities before concentrating on higher ranks
- **AND** it can activate learned, ready abilities with appropriate self, entity, or ground targets
- **AND** it selects enemy targets and aim points from team-visible information, without free upgrades or shorter cooldowns

#### Scenario: Bot issues an invalid or out-of-sight action
- **WHEN** a bot decision is invalid under the current match state or team vision
- **THEN** the server rejects or ignores that action without bypassing gameplay validation

### Requirement: Bot takeover preserves the participant tank
When a human-controlled participant leaves a started match, the system SHALL transfer control of that participant's existing tank to a bot rather than creating a replacement tank. An intentional leave SHALL transfer control immediately; an unexpected disconnection SHALL allow a 30-second reconnection grace period before transfer.

#### Scenario: Unexpected disconnection reaches the grace-period deadline
- **WHEN** a disconnected participant has not reclaimed their tank within 30 seconds
- **THEN** a bot takes control of that same tank without resetting its position, team, role, or match statistics

#### Scenario: Participant returns during the grace period
- **WHEN** the disconnected participant reclaims their tank within 30 seconds
- **THEN** human control resumes on the same tank and no bot takeover occurs

#### Scenario: Participant intentionally leaves
- **WHEN** a participant intentionally leaves a started match
- **THEN** a bot immediately takes control of that participant's existing tank

#### Scenario: Bot-controlled participant is shown in match results
- **WHEN** the match ends after a bot has taken over a participant's tank
- **THEN** the final result retains that participant's identity and statistics accumulated before and after the takeover
