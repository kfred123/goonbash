## 1. GitHub Actions Workflow — Trigger & Concurrency

- [x] 1.1 Add a `push` trigger scoped to `branches: [main]` to the deployment workflow, alongside the existing `pull_request` trigger
- [x] 1.2 Add a `concurrency` block (group keyed on the shared Render service, `cancel-in-progress: true`) so an older in-flight deploy doesn't clobber a newer one
- [x] 1.3 Update the metadata extraction step to correctly resolve commit SHA/branch for both `pull_request` and `push` event payloads
- [x] 1.4 (Optional) Rename `deploy-pr-preview.yml` to reflect it now also deploys on `main` pushes (e.g. `deploy-render-test.yml`), updating any references

## 2. Commit Metadata Propagation

- [x] 2.1 Compute a `DEPLOYED_AT` ISO 8601 timestamp in the workflow at trigger time
- [x] 2.2 Determine whether the Render deploy API supports setting env vars atomically with the deploy call, or requires a separate `PATCH` to the service's env vars first
- [x] 2.3 Add a workflow step that sets/updates `COMMIT_SHA`, `COMMIT_SHORT_SHA`, `SOURCE_BRANCH`, and `DEPLOYED_AT` on the Render service before/alongside triggering the deploy
- [ ] 2.4 Verify the new env vars appear in the Render dashboard after a deploy _(requires a live Render service + real deploy; cannot be verified in this workspace)_

## 3. Backend Deployment Info Endpoint

- [x] 3.1 Add a `GET /deployment-info` route in `backend/src/index.ts` reading `COMMIT_SHA`, `COMMIT_SHORT_SHA`, `SOURCE_BRANCH`, `DEPLOYED_AT` from `process.env`
- [x] 3.2 Return sensible fallback values (e.g. `"local"` / `"unknown"`) when those env vars are unset, so local development isn't broken
- [x] 3.3 Add/extend a test covering the endpoint's response shape and fallback behavior

## 4. Frontend Commit Badge

- [x] 4.1 Add a small fixed-position DOM badge (outside the Phaser canvas) to the frontend entry point
- [x] 4.2 Fetch `GET /deployment-info` from the backend on load and populate the badge with short SHA and a human-readable timestamp
- [x] 4.3 Handle fetch failure gracefully by showing a fallback label without blocking game load
- [x] 4.4 Style the badge to be unobtrusive (small, low-opacity, corner-positioned)

## 5. PR Communication Updates

- [x] 5.1 Update the success/failure PR comment templates to mention that the shared test environment also redeploys automatically on `main` pushes
- [x] 5.2 Update `DEPLOYMENT.md` / `RENDER_SETUP.md` to document the new `main` push trigger and the commit badge

## 6. Testing & Validation

- [ ] 6.1 Open a test PR and confirm the badge updates to that PR's commit after deployment _(requires a live Render service + a real PR)_
- [ ] 6.2 Merge the PR and confirm a subsequent deployment updates the badge to the merge commit on `main` _(requires a live Render service)_
- [ ] 6.3 Push a direct commit to `main` and confirm the badge updates again _(requires a live Render service)_
- [ ] 6.4 Trigger overlapping PR-update and main-push deploys and confirm the concurrency setting prevents an older deploy from overwriting a newer one _(requires a live Render service)_
- [x] 6.5 Verify `/deployment-info` and the frontend badge work correctly in local development (fallback values)
