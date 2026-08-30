## ADDED Requirements

### Requirement: GitHub Actions workflow triggers on pull requests
The system SHALL automatically execute a GitHub Actions workflow whenever a pull request is created or updated with new commits.

#### Scenario: Workflow triggers on PR creation
- **WHEN** a pull request is opened against the main branch
- **THEN** the GitHub Actions workflow is automatically triggered to begin deployment

#### Scenario: Workflow re-triggers on new commits
- **WHEN** new commits are pushed to a pull request branch
- **THEN** the GitHub Actions workflow is triggered again to redeploy with the latest code

#### Scenario: Workflow does not trigger on PR comments
- **WHEN** a comment is added to a pull request without new commits
- **THEN** the workflow is not executed to avoid unnecessary deployments

### Requirement: Render API authentication
The system SHALL authenticate with Render's API using a secure token stored in GitHub secrets.

#### Scenario: API key is securely stored
- **WHEN** the GitHub Actions workflow runs
- **THEN** the Render API key is retrieved from GitHub Secrets (RENDER_API_KEY) and used for authentication
- **THEN** the API key is never logged or exposed in workflow output

#### Scenario: Deployment fails gracefully on authentication error
- **WHEN** the Render API key is invalid or expired
- **THEN** the workflow fails with a clear error message indicating authentication failure
- **THEN** a failure status is posted to the pull request

### Requirement: Deployment status reporting
The system SHALL post the deployment status to the pull request.

#### Scenario: Successful deployment status
- **WHEN** the deployment to Render succeeds
- **THEN** a comment is posted to the PR indicating successful deployment
- **THEN** the comment references the stable test URL where reviewers can test

#### Scenario: Failed deployment status
- **WHEN** the Render deployment fails
- **THEN** a comment is posted to the PR with the failure reason and error details
- **THEN** the comment suggests troubleshooting steps or manual deployment alternatives
