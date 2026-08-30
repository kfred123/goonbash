## ADDED Requirements

### Requirement: WebSocket Connection
The system SHALL establish and maintain a persistent bidirectional WebSocket connection between the HTML5 client and the Node.js server using a framework like Colyseus or Socket.io.

#### Scenario: Client connects
- **WHEN** the player opens the game in their browser
- **THEN** the client establishes a WebSocket connection and the server assigns them a unique player session ID and adds them to a Game Room

### Requirement: State Broadcasting
The server SHALL broadcast the canonical game state to all connected clients at a fixed interval.

#### Scenario: Broadcasting state
- **WHEN** the server state broadcast timer triggers (e.g., every 50ms)
- **THEN** the server serializes the positions and states of all relevant entities (or calculates delta changes) and sends it to all connected clients
