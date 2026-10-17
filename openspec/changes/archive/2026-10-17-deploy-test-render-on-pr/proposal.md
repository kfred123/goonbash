## Why

Currently, there's no automated way to test changes in a live environment during the pull request review process. Reviewers must manually deploy or wait for manual testing. By automatically deploying test versions to Render on every PR, we streamline code review, enable faster feedback loops, and reduce manual deployment overhead.

## What Changes

- Add GitHub Actions workflow that triggers on every pull request
- Configure automatic deployment to a shared Render service test environment
- Use a single, stable test URL (e.g., `https://goonbash-test.onrender.com`) for all PR testing
- Integrate Render API authentication with GitHub secrets
- Each PR deployment overwrites the previous test environment with the latest changes

## Capabilities

### New Capabilities
- `github-actions-pr-deployment`: Automated deployment workflow that deploys test versions to Render on every PR push
- `render-preview-environment`: Integration with Render service to host and manage test/preview deployments

### Modified Capabilities

## Impact

- **GitHub**: Requires GitHub Actions workflow setup, secret management for Render API tokens
- **Render**: Requires single Render service configuration for shared test environment
- **CI/CD**: Adds automated deployment step to PR pipeline
- **Team**: Reviewers use a single test URL for all PR testing; each PR deployment updates the same environment
