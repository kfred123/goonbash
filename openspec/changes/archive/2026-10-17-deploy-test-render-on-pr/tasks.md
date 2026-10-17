## 1. Render Service Setup

- [ ] 1.1 Create a single Render service for test deployments (e.g., `goonbash-test`)
- [ ] 1.2 Configure Render build command (find and document the correct build command for goonbash)
- [ ] 1.3 Configure Render start command (find and document the correct start command)
- [ ] 1.4 Set up environment variable placeholders for PR metadata (PR_NUMBER, BRANCH_NAME, COMMIT_SHA)
- [ ] 1.5 Configure Render service to accept deployments via API
- [ ] 1.6 Note the stable test URL (e.g., `https://goonbash-test.onrender.com`) for use in workflow
- [ ] 1.7 Test Render service manually (verify it can be deployed and accessed via the stable URL)

## 2. GitHub Secrets & Authentication

- [ ] 2.1 Create a Render API key in Render dashboard
- [ ] 2.2 Add Render API key to GitHub repository secrets as `RENDER_API_KEY`
- [ ] 2.3 Verify GitHub Secrets are accessible in Actions environment
- [ ] 2.4 Document secret management process for team

## 3. GitHub Actions Workflow

- [x] 3.1 Create `.github/workflows/deploy-pr-preview.yml` file
- [x] 3.2 Configure workflow trigger for `pull_request` (opened, reopened, synchronize)
- [x] 3.3 Add job to retrieve PR metadata (PR number, branch, commit SHA)
- [x] 3.4 Add job to call Render API to trigger deployment to the shared test service
- [x] 3.5 Add job to post deployment status comment on the PR (success or failure, no URL needed)
- [x] 3.6 Add error handling to post failure comments with troubleshooting info
- [x] 3.7 Hardcode the stable test URL reference in workflow comments/output

## 4. Testing & Validation

- [ ] 4.1 Create a test pull request with dummy changes
- [ ] 4.2 Verify workflow triggers and executes
- [ ] 4.3 Verify Render deployment starts and completes
- [ ] 4.4 Verify the stable test URL is accessible and shows the game with latest PR code
- [ ] 4.5 Verify PR comment is posted with deployment status (success or failure)
- [ ] 4.6 Test with subsequent commits to verify workflow re-triggers and updates test environment
- [ ] 4.7 Verify error handling by testing with invalid credentials
- [ ] 4.8 Test with multiple PRs to confirm only latest deployment is live

## 5. GitHub Configuration & Protection Rules

- [x] 5.1 Add GitHub branch protection rule: require deployment status check to pass
- [x] 5.2 Configure PR template to reference the deployment URL (optional)
- [x] 5.3 Document deployment process in repository README

## 6. Cleanup & Maintenance (Optional)

- [x] 6.1 Document how to manually restart or redeploy the test environment if needed
- [x] 6.2 Document how to manually trigger a redeployment if workflow fails
- [x] 6.3 Set up monitoring alerts for failed deployments (optional)

## 7. Documentation

- [x] 7.1 Document the stable test URL in CONTRIBUTING.md or wiki for team reference
- [x] 7.2 Create troubleshooting guide for common issues (deployment timeouts, build failures)
- [x] 7.3 Document how reviewers should use the test URL for PR testing
- [x] 7.4 Document how to manually trigger a redeployment if needed
