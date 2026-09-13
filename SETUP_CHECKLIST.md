# GoonBash PR Deployment - Setup Checklist

## ✅ Completed (Automated)
- [x] GitHub Actions Workflow created (`.github/workflows/deploy-render-test.yml`)
- [x] PR metadata extraction configured
- [x] Render API integration configured
- [x] Failure handling and PR comments configured
- [x] Deployment status checks configured
- [x] Documentation created (DEPLOYMENT.md, RENDER_SETUP.md)

## ⏳ Remaining (Manual Setup Required)

### Phase 1: Render Service Setup (10 minutes)

**Backend (Web Service):**
- [ ] Create Render account at https://render.com (if not already done)
- [ ] Create new "Web Service" in Render Dashboard
- [ ] Name it: `goonbash-test`
- [ ] Connect your GitHub repository
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `npm run start --workspace=backend`
- [ ] Add Environment Variables:
  - [ ] `PORT = 2567`
  - [ ] `NODE_ENV = development`
- [ ] Select Free instance and deploy
- [ ] Save the Service URL (e.g., `https://goonbash-test.onrender.com`)
- [ ] Save the Service ID (from URL: `srv-xxxxx`)

**Frontend (Static Site):**
- [ ] Create new "Static Site" in Render Dashboard
- [ ] Name it: `goonbash-test-frontend`
- [ ] Connect the same GitHub repository
- [ ] Set Build Command: `npm install && npm run build --workspace=frontend`
- [ ] Set Publish Directory: `frontend/dist`
- [ ] Add Environment Variables:
  - [ ] `VITE_BACKEND_HTTP_URL = https://goonbash-test.onrender.com`
  - [ ] `VITE_BACKEND_WS_URL = wss://goonbash-test.onrender.com`
- [ ] Deploy
- [ ] Save the Service URL (e.g., `https://goonbash-test-frontend.onrender.com`)
- [ ] Save the Service ID (from URL: `srv-xxxxx`)

**Estimated Time:** 10 minutes

### Phase 2: GitHub Secrets Setup (2 minutes)
- [ ] Create Render API Key in Render Dashboard → Settings → API Keys
- [ ] Add GitHub Secret: `RENDER_API_KEY`
- [ ] Add GitHub Secret: `RENDER_BACKEND_SERVICE_ID`
- [ ] Add GitHub Secret: `RENDER_FRONTEND_SERVICE_ID`
- [ ] Verify secrets are accessible in Actions environment

**Estimated Time:** 2 minutes

### Phase 3: Test & Validation (10 minutes)
- [ ] Create a test pull request with a dummy change
- [ ] Wait for GitHub Actions workflow to trigger
- [ ] Verify PR comment shows deployment status
- [ ] Visit test URL to verify deployment succeeded
- [ ] Test with a second commit to verify re-deployment works
- [ ] (Optional) Test error handling with invalid credentials

**Estimated Time:** 10 minutes

### Phase 4: GitHub Configuration (Optional, 5 minutes)
- [ ] Add branch protection rule for `main` branch
- [ ] Require "Render Test Deployment" status check
- [ ] Require PR reviews (if not already required)

**Estimated Time:** 5 minutes

---

## Quick Links

- 📖 **Full Setup Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📋 **Troubleshooting:** [RENDER_SETUP.md](./RENDER_SETUP.md#troubleshooting)
- 🎮 **Test Environment:** https://goonbash-test-frontend.onrender.com (after setup)
- 📊 **Render Dashboard:** https://dashboard.render.com
- ⚙️ **GitHub Secrets:** https://github.com/kfred123/goonbash/settings/secrets/actions

---

## How to Get Started

1. **Follow the checklist above** in order
2. Start with **Phase 1: Render Service Setup** (5 minutes)
3. Move to **Phase 2: GitHub Secrets** (2 minutes)
4. **Phase 3: Test** (10 minutes)
5. Done! PRs will now auto-deploy 🚀

**Total Setup Time:** ~20 minutes

---

## Architecture Overview

```
Pull Request → GitHub Actions Triggered
   ↓
Workflow Extracts: PR #, Branch, Commit SHA
   ↓
Calls Render API to Deploy to goonbash-test (backend) and goonbash-test-frontend (frontend) Services
   ↓
Polls Deployment Status for both (max 10 minutes)
   ↓
Posts Comment with Status + Test URL
   ↓
Updates Commit Status Check
   ↓
Test at: https://goonbash-test-frontend.onrender.com
```

---

## Support

- **Issue with setup?** Check [RENDER_SETUP.md](./RENDER_SETUP.md#troubleshooting)
- **Workflow not triggering?** Verify GitHub secrets are set correctly
- **Deployment failing?** Check Render Dashboard logs
- **Need help?** Create an issue or check documentation

---

**Status:** 🟡 Setup in progress (17/36 tasks automated)

**Next Step:** Go to [DEPLOYMENT.md](./DEPLOYMENT.md) and follow Phase 1
