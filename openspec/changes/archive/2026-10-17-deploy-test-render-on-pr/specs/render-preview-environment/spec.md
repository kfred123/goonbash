## ADDED Requirements

### Requirement: Render service accepts deployment requests
The system SHALL maintain a single, shared Render service endpoint that accepts deployment requests.

#### Scenario: Service receives valid deployment request
- **WHEN** a deployment request is sent to the Render service with repository and branch information
- **THEN** the Render service validates the request parameters
- **THEN** the service acknowledges receipt and begins the deployment process
- **THEN** any previous deployment on this service is replaced

#### Scenario: Service rejects invalid requests
- **WHEN** a deployment request is missing required parameters
- **THEN** the Render service returns a validation error
- **THEN** deployment does not proceed

### Requirement: Shared test environment
The system SHALL maintain a single, stable test environment at a consistent URL.

#### Scenario: All PRs deploy to the same environment
- **WHEN** multiple pull requests are deployed
- **THEN** each deployment replaces the previous one on the shared Render service
- **THEN** the environment is always accessible at the same stable URL (e.g., `https://goonbash-test.onrender.com`)

#### Scenario: Latest PR code is always live
- **WHEN** a deployment completes
- **THEN** the test URL immediately serves the latest PR's code
- **THEN** previous PR test state is replaced

### Requirement: Application build and startup
The system SHALL build and start the application using configured build and start commands.

#### Scenario: Application builds successfully
- **WHEN** a deployment is triggered
- **THEN** Render executes the build command to prepare the application
- **THEN** build artifacts are available for the start process

#### Scenario: Application starts and becomes accessible
- **WHEN** the build completes successfully
- **THEN** Render executes the start command to launch the application
- **THEN** the application becomes accessible at the test URL
- **THEN** health checks confirm the application is running

#### Scenario: Build failure is reported
- **WHEN** the build command fails
- **THEN** Render captures the build logs
- **THEN** a failure status is returned with error details available to the workflow

### Requirement: Environment variables for test context
The system SHALL pass PR metadata to the deployed application via environment variables.

#### Scenario: PR context environment variables are set
- **WHEN** a deployment is created for a pull request
- **THEN** environment variables are set containing:
  - PR number
  - Branch name
  - Commit SHA

#### Scenario: Application can access PR metadata
- **WHEN** the deployed application runs
- **THEN** it can read PR-specific environment variables
- **THEN** it can display or use this metadata (e.g., in UI footer, logs, or testing)

### Requirement: Stable deployment URL
The system SHALL provide a consistent, publicly accessible URL for all test deployments.

#### Scenario: URL is stable across deployments
- **WHEN** multiple PRs are deployed sequentially
- **THEN** all deployments use the same URL
- **THEN** the URL does not change between deployments

#### Scenario: URL is accessible from external networks
- **WHEN** a reviewer receives the test URL
- **THEN** the URL is accessible from any external network without VPN or special access
- **THEN** HTTPS is enforced for secure communication
