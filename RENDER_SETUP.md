# Render PR Deployment Setup Guide

## Overview
This guide explains how to set up automated test deployments to Render for every pull request **and every push to `main`**, so the shared test environment always tracks the most recently pushed commit.

## Build & Start Commands for GoonBash

**Build Command:**
```bash
npm install
```

**Start Command (Backend only):**
```bash
npm run start --workspace=backend
```

> **Note:** The frontend runs on Vite development server in development mode. For production, you may want to build the frontend and serve it as static assets from the backend. This requires additional configuration in the backend Express.js server.

**Environment Variables:**
- `PORT`: Server port (default: 2567)
- `NODE_ENV`: Environment (development/production)
- `COMMIT_SHA`: Full SHA of the currently deployed commit (set/updated by GitHub Actions on every deploy)
- `COMMIT_SHORT_SHA`: Short (7-char) SHA of the currently deployed commit (set by GitHub Actions)
- `SOURCE_BRANCH`: Branch the currently deployed commit came from (set by GitHub Actions)
- `DEPLOYED_AT`: ISO 8601 timestamp of when the current deployment was triggered (set by GitHub Actions)

These four commit-tracking variables are read by the backend's `GET /deployment-info` endpoint and shown in a small badge in the frontend, so testers can always see which commit is currently live.

## Step 1: Create Render Service

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
   - Name: `RENDER_SERVICE_ID`
   - Value: (your Render service ID - find it in the service URL: `https://dashboard.render.com/web/srv-XXXXX`)

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
   - GitHub Actions workflow is triggered (a `concurrency` group cancels any older in-flight run for the same shared service)
   - Workflow extracts commit metadata (PR number if applicable, branch, commit SHA)
   - Workflow updates the Render service's `COMMIT_SHA`, `COMMIT_SHORT_SHA`, `SOURCE_BRANCH`, and `DEPLOYED_AT` env vars
   - Render API is called to deploy the latest code to `goonbash-test` service
   - Deployment status is posted as a PR comment (for PR-triggered runs)
   - Status check is added to the commit (for PR-triggered runs)

2. Reviewers can test the changes at: **https://goonbash-test.onrender.com**, and confirm the exact commit/deploy time via the badge shown in the game

3. Each new deployment (from a PR or from `main`) replaces the previous test environment — the environment always reflects the most recently pushed commit

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
- Verify `RENDER_SERVICE_ID` is correct
- Ensure the `goonbash-test` service exists in Render
- Check the service ID matches your service

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

**Test URL:** https://goonbash-test.onrender.com

For more information, see the [Render documentation](https://render.com/docs).
