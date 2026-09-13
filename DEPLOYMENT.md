# GoonBash - PR Test Deployment Setup

This document guides you through setting up automated test deployments for every pull request **and every push to `main`**, so the shared test environment always runs the most recently pushed commit.

## Quick Start

### Prerequisites
- Render account ([https://render.com](https://render.com))
- GitHub admin access to this repository
- Node.js 18+ and npm

### What's Included
- ✅ GitHub Actions workflow (`.github/workflows/deploy-render-test.yml`)
- ✅ Render configuration guide (`RENDER_SETUP.md`)
- ⏳ Manual Render setup required

## Setup Steps (5 minutes)

### Step 1: Create Render Services

GoonBash needs **two** Render services: a Web Service for the backend and a Static Site for the frontend.

**Backend (Web Service):**
1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Create service with these settings:
   - **Name:** `goonbash-test`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start --workspace=backend`
   - **Region:** Europe (Frankfurt) or closest to you
   - **Instance Type:** Free
   - **Environment Variables:**
     ```
     PORT = 2567
     NODE_ENV = development
     ```
5. Click **Deploy** and wait for the first deployment to complete
6. Copy the service URL (e.g., `https://goonbash-test.onrender.com`)
7. Copy the Service ID from the dashboard URL (`srv-xxxxx`)

**Frontend (Static Site):**
1. Click **New +** → **Static Site**
2. Connect the same GitHub repository
3. Create service with these settings:
   - **Name:** `goonbash-test-frontend`
   - **Build Command:** `npm install && npm run build --workspace=frontend`
   - **Publish Directory:** `frontend/dist`
   - **Environment Variables:**
     ```
     VITE_BACKEND_HTTP_URL = https://goonbash-test.onrender.com
     VITE_BACKEND_WS_URL = wss://goonbash-test.onrender.com
     ```
4. Click **Deploy** and wait for the first deployment to complete
5. Copy the service URL (e.g., `https://goonbash-test-frontend.onrender.com`) — this is the URL testers actually open
6. Copy the Service ID from the dashboard URL (`srv-xxxxx`)

### Step 2: Add GitHub Secrets

1. Go to Repository **Settings** → **Secrets and variables** → **Actions**
2. Add **New repository secret:**
   - Name: `RENDER_API_KEY`
   - Value: (Create in Render Dashboard → **Settings** → **API Keys**)

3. Add another **New repository secret:**
   - Name: `RENDER_BACKEND_SERVICE_ID`
   - Value: `srv-xxxxx` (the backend Web Service ID)

4. Add another **New repository secret:**
   - Name: `RENDER_FRONTEND_SERVICE_ID`
   - Value: `srv-xxxxx` (the frontend Static Site ID)

### Step 3: Test It

1. Create a test pull request on any branch
2. Push a commit to your branch
3. GitHub Actions workflow will automatically trigger
4. ✅ Check the PR for deployment status comment
5. Visit **https://goonbash-test-frontend.onrender.com** to test the changes
6. The game shows a small badge in the bottom-right corner with the currently deployed commit (short SHA) and deploy timestamp, so you can confirm you're testing the expected version
7. Merge the PR (or push a commit directly to `main`) and confirm the badge updates to the new `main` commit

### Step 4: (Optional) Add Branch Protection

Require deployments to succeed before merging:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add rule for `main` branch
3. Check **Require status checks to pass before merging**
4. Search for and select **Render Test Deployment**
5. Save

## How It Works

```
Pull Request Created/Updated  OR  Push to main
         ↓
GitHub Actions Triggered (older in-flight runs are cancelled)
         ↓
Extract Commit Metadata (PR number if applicable, branch, commit SHA)
         ↓
Update backend Render env vars (COMMIT_SHA, COMMIT_SHORT_SHA, SOURCE_BRANCH, DEPLOYED_AT)
         ↓
Call Render API to Deploy BOTH backend and frontend services
         ↓
Poll Deployment Status for both services
         ↓
Post Comment with Status (PR events only)
         ↓
Update Commit Status Check (PR events only)
```

**Each deployment (from a PR push or a `main` push) replaces the previous test environment on both services**, so only the most recently pushed commit is live at:
**https://goonbash-test-frontend.onrender.com** — the game itself displays a badge with the current commit and deploy timestamp so this is always verifiable at a glance.

## Accessing Test Environment

### For Reviewers
- Click the PR comment with deployment status
- Or visit directly: **https://goonbash-test-frontend.onrender.com**
- Test the latest changes
- Provide feedback in PR comments

### For Developers
- Push changes to your PR branch
- Workflow automatically redeploys to test environment
- Quick feedback loop without manual deployment

## Monitoring

### Deployment Status
- **GitHub:** Check PR comments for automatic status updates
- **Render:** [Dashboard](https://dashboard.render.com) → your service → **Logs**
- **Commits:** Status check shows on each commit

### Troubleshooting

**Workflow doesn't trigger?**
- Confirm secrets `RENDER_API_KEY`, `RENDER_BACKEND_SERVICE_ID`, and `RENDER_FRONTEND_SERVICE_ID` are set
- Check that PR uses branches with commits (not just comments)

**Deployment fails?**
- Check Render logs in Dashboard
- Verify build command: `npm install`
- Verify start command: `npm run start --workspace=backend`
- Ensure `package.json` exists in root directory

**Application crashes after deploy?**
- Check Render logs for error messages
- Verify environment variables (PORT, NODE_ENV)
- Check that dependencies install correctly

See full troubleshooting: [RENDER_SETUP.md](./RENDER_SETUP.md)

## Manual Deployment

To deploy without PR (run once per service):

```bash
curl -X POST https://api.render.com/v1/services/<RENDER_BACKEND_SERVICE_ID>/deploys \
  -H "Authorization: Bearer <RENDER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}'

curl -X POST https://api.render.com/v1/services/<RENDER_FRONTEND_SERVICE_ID>/deploys \
  -H "Authorization: Bearer <RENDER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}'
```

## Architecture

### Services
- **goonbash-test (Render Web Service):** Backend (Express + Colyseus) on Port 2567
- **goonbash-test-frontend (Render Static Site):** Built frontend, connects to the backend via WebSocket using build-time `VITE_BACKEND_HTTP_URL`/`VITE_BACKEND_WS_URL`

### Workflow
- GitHub Actions triggers on PR create/update **and on pushes to `main`**
- Render API called to redeploy **both** the `goonbash-test` and `goonbash-test-frontend` services with the latest commit
- Backend env vars are updated with the latest commit metadata (the frontend Static Site has no runtime endpoint to update)
- New deployment replaces previous one — whichever trigger fires most recently wins
- Status updates posted to PR (for PR-triggered runs)
- Frontend badge shows the currently live commit + deploy time

### Limitations
- Only one PR can be tested at a time (by design)
- Test environment uses development configuration
- No persistent database (state reset on each deploy)

## Next Steps

1. ✅ Complete Steps 1-3 above
2. Create a test PR to verify workflow
3. Monitor first deployment in Render Dashboard
4. Share test URL with team for feedback
5. Iterate and improve based on team feedback

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GoonBash Repository](https://github.com/kfred123/goonbash)

---

**Test Environment URL:** https://goonbash-test-frontend.onrender.com
**Backend URL:** https://goonbash-test.onrender.com

**Status:** 🟡 Setup required (see steps above)

Last updated: 2026-08-30
