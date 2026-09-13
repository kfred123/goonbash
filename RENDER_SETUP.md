# Render PR Deployment Setup Guide

## Overview
This guide explains how to set up automated test deployments to Render for every pull request **and every push to `main`**, so the shared test environment always tracks the most recently pushed commit.

GoonBash is deployed to Render as **two separate services**:
- **`goonbash-test` (Web Service):** runs the backend (Express + Colyseus)
- **`goonbash-test-frontend` (Static Site):** serves the built frontend (Vite build output)

Both services are redeployed together by the workflow on every PR push and every push to `main`.

## Build & Start Commands for GoonBash

### Backend (Web Service)

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm run start --workspace=backend
```

**Environment Variables:**
- `PORT`: Server port (default: 2567)
- `NODE_ENV`: Environment (development/production)
- `COMMIT_SHA`: Full SHA of the currently deployed commit (set/updated by GitHub Actions on every deploy)
- `COMMIT_SHORT_SHA`: Short (7-char) SHA of the currently deployed commit (set by GitHub Actions)
- `SOURCE_BRANCH`: Branch the currently deployed commit came from (set by GitHub Actions)
- `DEPLOYED_AT`: ISO 8601 timestamp of when the current deployment was triggered (set by GitHub Actions)

These four commit-tracking variables are read by the backend's `GET /deployment-info` endpoint and shown in a small badge in the frontend, so testers can always see which commit is currently live.

### Frontend (Static Site)

**Build Command:**
```bash
npm install && npm run build --workspace=frontend
```

**Publish Directory:**
```
frontend/dist
```

**Build-time Environment Variables:**
- `VITE_BACKEND_HTTP_URL`: full HTTPS URL of the backend Web Service (e.g. `https://goonbash-test.onrender.com`)
- `VITE_BACKEND_WS_URL`: full WSS URL of the backend Web Service (e.g. `wss://goonbash-test.onrender.com`)

These are baked into the frontend bundle at build time by Vite, so the frontend knows where to reach the backend even though it's served from a different Render domain. Set them once in the Static Site's environment settings; they don't change per deploy.

## Step 1: Create Render Services

### Backend

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `goonbash-test`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start --workspace=backend`
   - **Region:** Choose closest to users (e.g., Frankfurt for Europe)
   - **Instance Type:** Free tier is fine for testing

5. Under **Environment**, add the following variables:
   ```
   PORT = 2567
   NODE_ENV = development
   ```

6. Deploy the service (manual initial deployment)
7. Note the service URL: `https://goonbash-test.onrender.com` (or your custom domain)

### Frontend

1. In Render Dashboard, click **New +** → **Static Site**
2. Connect the same GitHub repository
3. Configure the service:
   - **Name:** `goonbash-test-frontend`
   - **Build Command:** `npm install && npm run build --workspace=frontend`
   - **Publish Directory:** `frontend/dist`
4. Under **Environment**, add:
   ```
   VITE_BACKEND_HTTP_URL = https://goonbash-test.onrender.com
   VITE_BACKEND_WS_URL = wss://goonbash-test.onrender.com
   ```
5. Deploy the service (manual initial deployment)
6. Note the service URL: `https://goonbash-test-frontend.onrender.com` (or your custom domain) — this is the URL players/testers actually open

## Step 2: Get Render API Key

1. In Render Dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Copy the API key (save it securely)

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

   **Secret 1:**
   - Name: `RENDER_API_KEY`
   - Value: (paste the API key from Step 2)

   **Secret 2:**
   - Name: `RENDER_BACKEND_SERVICE_ID`
   - Value: (the backend Web Service ID - find it in its service URL: `https://dashboard.render.com/web/srv-XXXXX`)

   **Secret 3:**
   - Name: `RENDER_FRONTEND_SERVICE_ID`
   - Value: (the frontend Static Site ID - find it in its service URL: `https://dashboard.render.com/static/srv-XXXXX`)

## Step 4: Configure Render Service Webhook (Optional)

Note: pushes to `main` are now handled automatically by the GitHub Actions workflow itself (see "How It Works" below), so this webhook is no longer required for that purpose. It remains useful only as a backup/manual trigger.

To automatically redeploy when code is pushed to the main branch via a Render-native webhook instead:

1. In Render Dashboard, go to your `goonbash-test` service
2. Copy the **Deploy Hook** URL
3. In GitHub, go to **Settings** → **Webhooks** → **Add webhook**
4. Paste the Deploy Hook URL
5. Set events to trigger on `push` to `main` branch

## How It Works

1. When a PR is created/updated, **or when a commit is pushed to `main`**:
   - GitHub Actions workflow is triggered (a `concurrency` group cancels any older in-flight run for the same shared services)
   - Workflow extracts commit metadata (PR number if applicable, branch, commit SHA)
   - Workflow updates the backend service's `COMMIT_SHA`, `COMMIT_SHORT_SHA`, `SOURCE_BRANCH`, and `DEPLOYED_AT` env vars (the frontend Static Site doesn't have a runtime endpoint of its own, so this only targets the backend)
   - Render API is called to deploy the latest code to **both** the `goonbash-test` backend and `goonbash-test-frontend` frontend services
   - Deployment status is posted as a PR comment (for PR-triggered runs)
   - Status check is added to the commit (for PR-triggered runs)

2. Reviewers can test the changes at: **https://goonbash-test-frontend.onrender.com**, and confirm the exact commit/deploy time via the badge shown in the game

3. Each new deployment (from a PR or from `main`) replaces the previous test environment on both services — the environment always reflects the most recently pushed commit

## Monitoring Deployments

- **GitHub:** Check PR comments for deployment status
- **Render Dashboard:** Visit https://dashboard.render.com to monitor active deployments
- **Logs:** Render provides real-time logs for each deployment

## Troubleshooting

### Deployment fails with "Authentication failed"
- Verify `RENDER_API_KEY` is correctly set in GitHub secrets
- Check that the API key has not expired
- Regenerate the key if needed

### Deployment fails with "Service not found"
- Verify `RENDER_BACKEND_SERVICE_ID` and `RENDER_FRONTEND_SERVICE_ID` are correct
- Ensure both the `goonbash-test` and `goonbash-test-frontend` services exist in Render
- Check the service IDs match your services

### Build fails with "npm: command not found"
- Verify Node.js environment is selected in Render
- Check that your repository has a `package.json` in the root

### Application crashes after deployment
- Check Render logs: **Services** → **goonbash-test** → **Logs**
- Verify all dependencies are correctly specified in `package.json`
- Ensure environment variables are correctly set

### Port conflicts
- Ensure the `PORT` environment variable is set (default: 2567)
- Render forwards traffic correctly, but check that the app binds to the correct port

## Manual Deployment

To manually deploy without creating a PR:

```bash
curl -X POST https://api.render.com/v1/services/<SERVICE_ID>/deploys \
  -H "Authorization: Bearer <RENDER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}'
```

Replace:
- `<SERVICE_ID>`: Your Render service ID
- `<RENDER_API_KEY>`: Your Render API key

## Production Deployment

This setup is designed for **test/preview** environments only. For production deployment:

1. Set up a separate Render service for production
2. Configure it with appropriate security settings
3. Use a different deployment workflow (e.g., manual approval required)
4. Consider database backups, SSL certificates, and monitoring

---

**Test URL (frontend):** https://goonbash-test-frontend.onrender.com
**Backend URL:** https://goonbash-test.onrender.com

For more information, see the [Render documentation](https://render.com/docs).
