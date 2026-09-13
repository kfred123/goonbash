## ADDED Requirements

### Requirement: Display main menu with name entry
The client SHALL show a main menu as the first screen on load, before any lobby list or network connection, and SHALL require the player to enter a display name before proceeding.

#### Scenario: Client loads for the first time
- **WHEN** the client finishes loading
- **THEN** it displays the main menu with a name input field and a `Continue` action
- **AND** it does not contact the lobby backend or connect to any room yet

#### Scenario: Player submits an empty name
- **WHEN** the player activates `Continue` with an empty or whitespace-only name field
- **THEN** the client remains on the main menu
- **AND** it displays a validation message requesting a name

#### Scenario: Player submits a valid name
- **WHEN** the player enters a non-empty name and activates `Continue`
- **THEN** the client stores the trimmed name for the session
- **AND** it navigates to the lobby menu

### Requirement: Persist the entered name across visits
The client SHALL persist the player's entered name in durable browser storage so it survives page reloads and future visits, and SHALL use the stored name whenever creating or joining a lobby without prompting again unless the player changes it.

#### Scenario: Player creates or joins a lobby after entering a name
- **WHEN** the player creates or joins a lobby from the lobby menu
- **THEN** the client includes the previously entered name when connecting to the room

#### Scenario: Player returns to the main menu
- **WHEN** the player navigates back to the main menu from the lobby menu
- **THEN** the client pre-fills the name field with the previously entered name
- **AND** the player can change the name before continuing again

#### Scenario: Player revisits the client after closing the browser
- **WHEN** the player reloads the page or reopens the client in a new browser session
- **THEN** the client pre-fills the name field with the name persisted from the previous visit
- **AND** the player can accept it or change it before continuing
