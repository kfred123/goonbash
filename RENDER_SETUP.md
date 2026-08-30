# Render PR Deployment Setup Guide

## Overview
This guide explains how to set up automated test deployments to Render for every pull request.

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
- `PR_NUMBER`: Current PR number (set by GitHub Actions)
- `BRANCH_NAME`: Current branch name (set by GitHub Actions)
- `COMMIT_SHA`: Current commit SHA (set by GitHub Actions)

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

To automatically redeploy when code is pushed to the main branch:

1. In Render Dashboard, go to your `goonbash-test` service
2. Copy the **Deploy Hook** URL
3. In GitHub, go to **Settings** → **Webhooks** → **Add webhook**
4. Paste the Deploy Hook URL
5. Set events to trigger on `push` to `main` branch

## How It Works

1. When a PR is created or updated with new commits:
   - GitHub Actions workflow is triggered
   - Workflow extracts PR metadata (number, branch, commit)
   - Render API is called to deploy the latest code to `goonbash-test` service
   - Deployment status is posted as a PR comment
   - Status check is added to the commit

2. Reviewers can test the changes at: **https://goonbash-test.onrender.com**

3. Each new PR deployment replaces the previous test environment

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
