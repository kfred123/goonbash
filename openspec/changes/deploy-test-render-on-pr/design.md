## Context

The goonbash game repository needs automated test deployments to enable rapid feedback on pull requests. Currently, testing changes requires manual deployment steps. Render provides a simple, scalable deployment platform with built-in GitHub integration. A shared test environment at a single, stable URL allows rapid iteration without managing multiple deployment URLs.

## Goals / Non-Goals

**Goals:**
- Automatically deploy test versions to a shared Render test environment on every PR
- Use a single, stable test URL for all PR testing (no per-PR URLs)
- Each PR deployment updates the same test environment with latest changes
- Integrate with GitHub's PR review workflow
- Simplify the manual deployment process

**Non-Goals:**
- Production deployment automation (to be handled separately)
- Per-PR isolated environments (intentionally using shared environment)
- Database migration/seeding for test environments
- SSL certificate management (Render handles this)

## Decisions

**1. GitHub Actions Trigger**
- Use `pull_request` and `pull_request_synchronize` events to trigger on PR creation and updates
- Rationale: Ensures every code change is tested before review; avoids redundant deployments on comment-only updates
- Alternative: Manual trigger via workflow_dispatch (rejected – not automatic enough)

**2. Render Service Configuration**
- Maintain a single Render service dedicated to test deployments (e.g., `goonbash-test`)
- Deploy all PRs to the same service (previous deployments are replaced)
- Use environment variables to track which PR is currently deployed
- Rationale: Reduces resource overhead, simpler management, single consistent URL for reviewers
- Alternative: Separate service per PR (rejected – resource intensive, multiple URLs to track)

**3. GitHub Secrets & Authentication**
- Store Render API key as `RENDER_API_KEY` GitHub secret
- Use curl or render CLI to trigger deployments via API
- Rationale: Secure, no hardcoded credentials; integrates seamlessly with GitHub Actions
- Alternative: Use GitHub deployments API (rejected – adds complexity without clear benefit)

**4. Deployment URL (Single, Stable)**
- All deployments use the same URL: `https://goonbash-test.onrender.com`
- Reviewers bookmark this URL for quick access
- Rationale: Simple, consistent, no need to track multiple preview URLs
- Alternative: Generate new URL per PR (rejected – adds unnecessary complexity)

**5. Deployment Status Reporting**
- Post deployment status (success/failure) as a PR comment
- Do not include URL in comment (URL is always the same)
- Add deployment status check to prevent merging until deployment succeeds
- Rationale: Gives reviewers visibility of deployment status without cluttering with redundant URLs
- Alternative: Post URL in each comment (rejected – URL never changes, wastes space)

## Risks / Trade-offs

**[Risk]** Render resource limits: Multiple simultaneous PR deployments could hit account limits  
→ **Mitigation**: Since using shared environment, only one deployment runs at a time; queue builds if needed

**[Risk]** Overwritten state: Previous PR test state is lost when new PR deploys  
→ **Mitigation**: This is intentional – test environment always has the latest PR version

**[Trade-off]** Shared environment means only one PR can be tested at a time  
→ Accept this trade-off for simplicity and resource efficiency

## Migration Plan

1. Create Render service for test deployments (manual setup in Render UI)
2. Generate Render API key and add to GitHub secrets
3. Create GitHub Actions workflow file
4. Test with a sample PR
5. Enable GitHub status check requirement
6. Document process for team

## Open Questions

- What is the game's build and start command? (needed for Render configuration)
- Should the test URL be published in the repository README or a pinned issue?
