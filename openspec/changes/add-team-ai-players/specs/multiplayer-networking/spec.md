# Spec Delta

## ADDED Requirements

### Requirement: Reclaim a disconnected participant during the grace period
After an unexpected disconnection during a started match, the system SHALL reserve the participant's existing tank for 30 seconds and allow its holder of valid reconnection authority to reclaim control during that period. The reservation SHALL expire when control is transferred to a bot. The reconnection token is a bearer secret; the system cannot distinguish its legitimate holder from someone who obtains it.

#### Scenario: Participant reconnects within the grace period
- **WHEN** the disconnected participant presents valid server-recognized reconnection authority within 30 seconds
- **THEN** the participant resumes control of the same tank without creating a duplicate participant

#### Scenario: Invalid authority cannot reclaim the tank
- **WHEN** a client presents invalid or expired reconnection authority
- **THEN** the server rejects the attempt and does not transfer control of the tank

#### Scenario: Reconnection grace period expires
- **WHEN** 30 seconds pass without the participant reclaiming the tank
- **THEN** the reservation expires and a late connection cannot displace the bot that has taken control

#### Scenario: Reconnection uses current visibility
- **WHEN** a participant reclaims a tank during the grace period
- **THEN** the server sends a fresh state view based on the participant's current team and visibility rather than restoring stale spatial data
