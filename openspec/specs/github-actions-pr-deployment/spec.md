## Purpose

Defines pull-request deployment triggers, secure Render API authentication, and reviewer-facing deployment status for the shared test service.

## Requirements

### Requirement: GitHub Actions workflow triggers on pull requests
The system SHALL automatically execute a GitHub Actions deployment workflow whenever a pull request is opened, reopened, or synchronized with new commits. This SHALL include pull requests against `main`; pushes to `main` SHALL also deploy under the continuous deployment requirements.

#### Scenario: Workflow triggers on PR creation
- **WHEN** a pull request is opened against the main branch
- **THEN** the GitHub Actions workflow is automatically triggered to begin deployment using the PR head commit

#### Scenario: Workflow re-triggers on new commits
- **WHEN** new commits are pushed to a pull request branch
- **THEN** the GitHub Actions workflow is triggered again to redeploy with the latest PR head commit

#### Scenario: Workflow does not trigger on PR comments
- **WHEN** a comment is added to a pull request without new commits
- **THEN** the workflow is not executed to avoid unnecessary deployments

### Requirement: Render API authentication
The system SHALL authenticate with Render's API using a secure token stored in GitHub secrets.

#### Scenario: API key is securely stored
- **WHEN** the GitHub Actions workflow runs
- **THEN** the Render API key is retrieved from GitHub Secrets (`RENDER_API_KEY`) and used for authentication
- **AND** the API key is never logged or exposed in workflow output

#### Scenario: Deployment fails gracefully on authentication error
- **WHEN** the Render API key is invalid or expired
- **THEN** the workflow fails with a clear error message indicating authentication failure
- **AND** a failure status is posted to the associated pull request when the trigger is a PR event

### Requirement: Deployment status reporting
The system SHALL post deployment status to the associated pull request for PR-triggered deployments. Status comments SHALL explain that newer deployments from other PRs or pushes to `main` can replace the shared environment.

#### Scenario: Successful deployment status
- **WHEN** a PR-triggered deployment to Render succeeds
- **THEN** a comment is posted to the PR indicating successful deployment
- **AND** the comment references the stable test URL and warns that subsequent deployments can replace its code

#### Scenario: Failed deployment status
- **WHEN** a PR-triggered Render deployment fails or times out
- **THEN** a comment is posted to the PR with the failure reason and error details
- **AND** the comment suggests troubleshooting steps or manual deployment alternatives
