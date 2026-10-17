## Purpose

Defines the shared Render test environment containing a backend Web Service and a frontend Static Site, its reviewer-facing game URL, build and publication steps, and deployment metadata for PR and main-branch deployments.

## Requirements

### Requirement: Render service accepts deployment requests
The system SHALL maintain one shared Render test environment containing a backend Web Service and a frontend Static Site. The deployment workflow SHALL submit deployment requests for the selected commit to both services through the Render API.

#### Scenario: Service receives valid deployment request
- **WHEN** the workflow submits valid deployment requests for the selected commit to the backend and frontend services
- **THEN** Render validates the request parameters and begins deployment for each service
- **AND** a successful environment deployment updates both services to that commit, subject to latest-trigger concurrency control

#### Scenario: Service rejects invalid requests
- **WHEN** a deployment request is missing required parameters
- **THEN** the Render service returns a validation error
- **AND** deployment of the affected service does not proceed

### Requirement: Shared test environment
The system SHALL maintain a single, stable test environment at a consistent URL, shared by deployments from pull requests and pushes to `main`. Among overlapping triggers, the most recently triggered deployment SHALL supersede older runs; the environment SHALL NOT be permanently reserved for the latest PR alone.

#### Scenario: All PRs deploy to the same environment
- **WHEN** multiple pull requests are deployed
- **THEN** each successful, non-superseded environment deployment replaces the previous one on both shared Render services
- **AND** reviewers open the game at the stable frontend Static Site URL (e.g., `https://goonbash-test-frontend.onrender.com`), which connects to the backend Web Service URL

#### Scenario: Latest PR code is live until superseded
- **WHEN** a PR deployment completes successfully and no later deployment trigger supersedes it
- **THEN** the test URL serves that PR head commit and replaces previous test state
- **AND** a later PR deployment or push to `main` can replace it at the same URL

#### Scenario: Main deployment supersedes a PR deployment
- **WHEN** a push to `main` triggers a deployment after a PR deployment
- **THEN** both services end up serving the newer `main` commit rather than restoring the older PR code

### Requirement: Application build and startup
The system SHALL prepare and start the backend using its configured Web Service build and start commands, and SHALL build the frontend and publish `frontend/dist` through the Static Site. The frontend bundle SHALL use the configured backend HTTP and WebSocket URLs.

#### Scenario: Application builds successfully
- **WHEN** a deployment is triggered
- **THEN** Render executes the backend's configured build command to prepare its dependencies
- **AND** Render executes the frontend build command to generate `frontend/dist`
- **AND** backend dependencies are available for startup and frontend artifacts are available for static publication

#### Scenario: Application starts and becomes accessible
- **WHEN** the build completes successfully
- **THEN** Render executes the backend start command to launch the Web Service and publishes `frontend/dist` through the Static Site without a frontend server start command
- **AND** the game becomes accessible at the frontend URL and connects to the backend HTTP and WebSocket endpoints
- **AND** backend health checks confirm the Web Service is running

#### Scenario: Build failure is reported
- **WHEN** the build command fails
- **THEN** Render captures the build logs
- **AND** a failure status is returned with error details available to the workflow

### Requirement: Environment variables for test context
The system SHALL pass PR metadata to PR deployments via environment variables and propagate the actual deployed commit and source branch for both PR and `main` deployments. A `main` deployment SHALL NOT retain an unrelated previous PR's context.

#### Scenario: PR context environment variables are set
- **WHEN** a deployment is created for a pull request
- **THEN** environment variables contain the PR number, branch name, and commit SHA

#### Scenario: Application can access PR metadata
- **WHEN** the application runs after a PR deployment
- **THEN** it can read PR-specific environment variables
- **AND** it can display or use the metadata in its UI, logs, or testing

#### Scenario: Main context replaces PR metadata
- **WHEN** a push to `main` deploys after a PR deployment
- **THEN** the environment identifies the deployed `main` commit and branch and clears or omits the previous PR number

### Requirement: Stable deployment URL
The system SHALL provide a consistent, publicly accessible frontend Static Site URL as the reviewer-facing game URL for all test deployments. The backend Web Service SHALL have its own stable URL for API and WebSocket connections; it SHALL NOT be presented as the game page.

#### Scenario: URL is stable across deployments
- **WHEN** multiple PR and `main` deployments run sequentially
- **THEN** all deployments use the same URL
- **AND** the URL does not change between deployments

#### Scenario: URL is accessible from external networks
- **WHEN** a reviewer receives the test URL
- **THEN** the URL is accessible from external networks without VPN or special access
- **AND** HTTPS is enforced for secure communication
