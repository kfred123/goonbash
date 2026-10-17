## ADDED Requirements

### Requirement: Deploy on pull request events
The system SHALL trigger a deployment of the shared Render test service whenever a pull request is opened, reopened, or synchronized (new commits pushed to the PR branch).

#### Scenario: PR opened
- **WHEN** a pull request is opened against the repository
- **THEN** the GitHub Actions workflow triggers a Render deployment using the PR branch's head commit

#### Scenario: New commit pushed to open PR
- **WHEN** a new commit is pushed to an already-open pull request's branch
- **THEN** the GitHub Actions workflow triggers a new Render deployment using the new head commit

### Requirement: Deploy on push to main
The system SHALL trigger a deployment of the shared Render test service whenever a commit is pushed (including via a merged pull request) to the `main` branch.

#### Scenario: Direct push to main
- **WHEN** a commit is pushed directly to the `main` branch
- **THEN** the GitHub Actions workflow triggers a Render deployment using that commit

#### Scenario: Pull request merged into main
- **WHEN** a pull request is merged, resulting in new commits on `main`
- **THEN** the GitHub Actions workflow triggers a Render deployment using the resulting `main` commit

### Requirement: Latest pushed commit is always the one deployed
The system SHALL ensure that, among overlapping deployment triggers, the most recently triggered deployment is the one that ends up running on the shared test service.

#### Scenario: Overlapping PR and main deployments
- **WHEN** a deployment triggered by a `main` push starts after a deployment triggered by a PR event, and both target the shared test service
- **THEN** the workflow's concurrency control cancels or supersedes the older in-progress run so the service ends up running the commit from the most recently triggered deployment

### Requirement: Deployment status feedback on pull requests
The system SHALL post a comment on the associated pull request indicating whether the deployment succeeded or failed, and SHALL note that the shared test environment may be subsequently updated by other pull requests or by pushes to `main`.

#### Scenario: Successful deployment from a PR
- **WHEN** a Render deployment triggered by a pull request event completes successfully
- **THEN** a success comment is posted on that pull request noting the deployment is live and that the environment updates automatically on newer pushes (including to `main`)

#### Scenario: Failed deployment from a PR
- **WHEN** a Render deployment triggered by a pull request event fails or times out
- **THEN** a failure comment with troubleshooting guidance is posted on that pull request
