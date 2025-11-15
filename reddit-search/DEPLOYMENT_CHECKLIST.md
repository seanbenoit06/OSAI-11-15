# Fly.io Deployment Checklist

## ✅ Pre-Deployment (Complete)

- [x] Created `fly.toml` configuration
- [x] Created `Dockerfile` for containerization
- [x] Created `.dockerignore` to exclude unnecessary files
- [x] Created `.flyignore` for Fly-specific exclusions
- [x] Created `DEPLOYMENT_GUIDE.md` with instructions
- [x] All dependencies in `requirements.txt`
- [x] Environment variables documented

---

## 🚀 Ready to Deploy

### Files Created:
1. ✅ `fly.toml` - Fly.io configuration
2. ✅ `Dockerfile` - Container build instructions
3. ✅ `.dockerignore` - Excludes from Docker build
4. ✅ `.flyignore` - Excludes from Fly deployment
5. ✅ `DEPLOYMENT_GUIDE.md` - Complete deployment instructions

---

## Deployment Commands (Quick Reference)

### 1. Install Fly CLI (if not installed)
```powershell
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Login
```bash
fly auth login
```

### 3. Launch App
```bash
cd "C:\Users\jjlai\Desktop\Oss4 ai 11_15"
fly launch
```

### 4. Set Secrets (IMPORTANT!)
```bash
fly secrets set OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"
fly secrets set OPENAI_MODEL="gpt-5-mini-2025-08-07"
```

### 5. Deploy
```bash
fly deploy
```

### 6. Test
```bash
fly open
# Or
curl https://your-app-name.fly.dev/health
```

---

## Post-Deployment Tasks

### ⚠️ Security (IMPORTANT)
- [ ] Update CORS in `main.py` to restrict to your Chrome extension origin
- [ ] Verify secrets are set: `fly secrets list`
- [ ] Test API endpoints thoroughly
- [ ] Monitor initial logs: `fly logs -f`

### 📊 Monitoring
- [ ] Check app status: `fly status`
- [ ] Open dashboard: `fly dashboard`
- [ ] Set up monitoring alerts (optional)

### 🔗 Integration
- [ ] Update Chrome extension with new API URL
- [ ] Test from Chrome extension
- [ ] Monitor performance and costs

---

## Environment Variables Required

```bash
# Minimum required:
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-5-mini-2025-08-07

# Optional (has defaults):
REDDIT_USER_AGENT=reddit-review-analyzer/1.0 (Educational project)
REDDIT_SEARCH_LIMIT=40
REDDIT_COMMENT_LIMIT=8
REDDIT_REQUEST_DELAY=1.5
REDDIT_MAX_RETRIES=3
REDDIT_MAX_POST_AGE_DAYS=1095
```

---

## Cost Estimate

**Free Tier:**
- 3 shared-cpu-1x VMs (256MB RAM)
- 160GB outbound transfer/month
- Auto-scales to zero when idle

**Expected:**
- Light usage: **FREE**
- Medium usage: **$2-5/month**
- Heavy usage: **$10-20/month**

---

## Support Resources

- 📖 Full Guide: `DEPLOYMENT_GUIDE.md`
- 🌐 Fly.io Docs: https://fly.io/docs
- 💬 Community: https://community.fly.io
- 📊 Dashboard: `fly dashboard`

---

## Quick Commands

```bash
# Deploy
fly deploy

# Logs
fly logs -f

# Status
fly status

# Update secret
fly secrets set KEY="value"

# Restart
fly apps restart

# SSH
fly ssh console

# Scale
fly scale memory 1024
```

---

## ✅ You're Ready!

All files are created. Follow `DEPLOYMENT_GUIDE.md` for step-by-step instructions.

**Next step:** Install Fly CLI and run `fly launch`

