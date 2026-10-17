## Purpose

Defines the shared Render test service, stable public URL, application build and startup, and deployment metadata for PR and main-branch deployments.

## Requirements

### Requirement: Render service accepts deployment requests
The system SHALL maintain a single, shared Render service endpoint that accepts deployment requests.

#### Scenario: Service receives valid deployment request
- **WHEN** a deployment request is sent to the Render service with repository and branch information
- **THEN** the Render service validates the request parameters
- **AND** the service acknowledges receipt and begins deployment
- **AND** a successful deployment replaces the previous deployment, subject to latest-trigger concurrency control

#### Scenario: Service rejects invalid requests
- **WHEN** a deployment request is missing required parameters
- **THEN** the Render service returns a validation error
- **AND** deployment does not proceed

### Requirement: Shared test environment
The system SHALL maintain a single, stable test environment at a consistent URL, shared by deployments from pull requests and pushes to `main`. Among overlapping triggers, the most recently triggered deployment SHALL supersede older runs; the environment SHALL NOT be permanently reserved for the latest PR alone.

#### Scenario: All PRs deploy to the same environment
- **WHEN** multiple pull requests are deployed
- **THEN** each successful, non-superseded deployment replaces the previous one on the shared Render service
- **AND** the environment is accessible at the same stable URL (e.g., `https://goonbash-test.onrender.com`)

#### Scenario: Latest PR code is live until superseded
- **WHEN** a PR deployment completes successfully and no later deployment trigger supersedes it
- **THEN** the test URL serves that PR head commit and replaces previous test state
- **AND** a later PR deployment or push to `main` can replace it at the same URL

#### Scenario: Main deployment supersedes a PR deployment
- **WHEN** a push to `main` triggers a deployment after a PR deployment
- **THEN** the service ends up running the newer `main` commit rather than restoring the older PR code

### Requirement: Application build and startup
The system SHALL build and start the application using configured build and start commands.

#### Scenario: Application builds successfully
- **WHEN** a deployment is triggered
- **THEN** Render executes the build command to prepare the application
- **AND** build artifacts are available for the start process

#### Scenario: Application starts and becomes accessible
- **WHEN** the build completes successfully
- **THEN** Render executes the start command to launch the application
- **AND** the application becomes accessible at the test URL
- **AND** health checks confirm the application is running

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
The system SHALL provide a consistent, publicly accessible URL for all test deployments.

#### Scenario: URL is stable across deployments
- **WHEN** multiple PR and `main` deployments run sequentially
- **THEN** all deployments use the same URL
- **AND** the URL does not change between deployments

#### Scenario: URL is accessible from external networks
- **WHEN** a reviewer receives the test URL
- **THEN** the URL is accessible from external networks without VPN or special access
- **AND** HTTPS is enforced for secure communication
