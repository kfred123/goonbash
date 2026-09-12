## ADDED Requirements

### Requirement: Deployment commit metadata is propagated to the running environment
The system SHALL set the deployed commit's full SHA, short SHA, source branch, and a deployment timestamp as environment variables on the Render service as part of each deployment trigger.

#### Scenario: Deployment triggered
- **WHEN** a Render deployment is triggered by either a pull request event or a push to `main`
- **THEN** the Render service's environment variables are updated with the triggering commit's SHA, short SHA, source branch name, and an ISO 8601 deployment timestamp before or as part of that deploy

### Requirement: Backend exposes current deployment info
The backend SHALL expose an HTTP endpoint that returns the commit SHA, short SHA, branch, and deployment timestamp currently set in its environment.

#### Scenario: Deployment info requested
- **WHEN** a client sends a GET request to the deployment info endpoint
- **THEN** the backend responds with a JSON body containing `commitSha`, `commitShortSha`, `branch`, and `deployedAt`

#### Scenario: Running without deployment metadata (local development)
- **WHEN** the backend is started without the deployment-related environment variables set (e.g. local development)
- **THEN** the deployment info endpoint responds successfully with placeholder values (such as `"local"` or `"unknown"`) instead of erroring

### Requirement: Frontend displays the currently deployed commit
The frontend SHALL display, in a visible but unobtrusive UI element, the short commit SHA and deployment timestamp of the code currently running, sourced from the backend's deployment info endpoint.

#### Scenario: Game loads successfully
- **WHEN** the frontend finishes loading and successfully fetches deployment info from the backend
- **THEN** it renders a badge showing the short commit SHA and a human-readable deployment timestamp

#### Scenario: Deployment info request fails
- **WHEN** the frontend cannot fetch deployment info from the backend (e.g. network error)
- **THEN** the game still loads and functions normally, and the badge shows a fallback indicator (e.g. "unknown") instead of blocking the UI
