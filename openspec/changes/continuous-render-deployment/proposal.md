## Why

The current PR deployment workflow (`deploy-pr-preview.yml`) only deploys to the shared Render test service when a pull request is opened or updated. Once a PR merges, `main` is never redeployed, so the test environment can silently fall behind the actual latest code. Reviewers and testers also have no way to tell which commit is currently running on the test URL, leading to confusion about whether they are testing the right version. This change makes the test environment always reflect the most recent commit — whether it comes from an open PR or a merge to `main` — and exposes that commit's identity and deployment time directly in the game UI.

## What Changes

- Extend the Render deployment automation to also trigger on pushes to `main`, in addition to the existing pull request triggers, so the shared test service always runs the latest commit from whichever source (PR branch or `main`) pushed most recently.
- Pass commit metadata (SHA, short SHA, branch, deployment timestamp) into the deployed environment as environment variables during the Render deploy step.
- Add a small backend endpoint that exposes the currently running commit SHA and deployment timestamp.
- Add a frontend UI element (e.g. a small overlay/badge) that fetches and displays which commit (short SHA) and deployment timestamp is currently live, so testers can confirm they are looking at the expected version.
- Update PR comment/status messaging to clarify that `main` pushes also redeploy the shared environment (i.e., the test environment reflects "whatever was pushed last").

## Capabilities

### New Capabilities
- `deployment-commit-tracking`: Backend endpoint and frontend display that expose which commit (SHA + timestamp) is currently deployed/running in an environment.
- `continuous-render-deployment`: GitHub Actions automation that deploys the latest commit to the shared Render test service on both pull request events and pushes to `main`, ensuring the test environment always runs the newest commit regardless of source.

### Modified Capabilities

## Impact

- **GitHub Actions**: `.github/workflows/deploy-pr-preview.yml` gains a `push` trigger for `main` and now injects commit metadata as env vars on deploy; may be renamed/restructured to reflect it also handles main-branch deploys.
- **Backend**: New lightweight `/deployment-info` (or similar) endpoint in `backend/src/index.ts` returning commit SHA/timestamp read from environment variables set at deploy time.
- **Frontend**: `frontend/src/main.ts` (or a new small module) adds a UI element that fetches and renders the current commit/timestamp on load.
- **Render**: Environment variables `COMMIT_SHA`, `COMMIT_SHORT_SHA`, `DEPLOYED_AT` set on each deploy trigger via the Render API `envVars` override or a deploy hook.
- **Team**: Reviewers/testers can always see which exact commit and deploy time the shared test environment reflects, avoiding stale/ambiguous test results.
