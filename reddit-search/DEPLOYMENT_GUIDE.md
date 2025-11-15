# Fly.io Deployment Guide

## Prerequisites

1. **Install Fly CLI:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create Fly.io Account:**
   - Go to https://fly.io/app/sign-up
   - Sign up for a free account
   - Add payment method (required even for free tier)

---

## Deployment Steps

### 1. Login to Fly.io
```bash
fly auth login
```

### 2. Launch the Application
```bash
cd "C:\Users\jjlai\Desktop\Oss4 ai 11_15"
fly launch
```

When prompted:
- **Choose app name:** Press Enter to use the suggested name or type your own
- **Choose region:** Select closest region to your users (e.g., `sea` for Seattle)
- **Would you like to set up a Postgresql database?** → **No**
- **Would you like to set up an Upstash Redis database?** → **No**
- **Would you like to deploy now?** → **No** (we need to set secrets first)

### 3. Set Environment Variables (Secrets)

**IMPORTANT:** Set these before deploying:

```bash
# OpenAI Configuration
fly secrets set OPENAI_API_KEY="sk-proj-YOUR_ACTUAL_API_KEY"
fly secrets set OPENAI_MODEL="gpt-5-mini-2025-08-07"

# Reddit Configuration (optional - has defaults)
fly secrets set REDDIT_USER_AGENT="reddit-review-analyzer/1.0 (Educational project)"
fly secrets set REDDIT_SEARCH_LIMIT="40"
fly secrets set REDDIT_COMMENT_LIMIT="8"
fly secrets set REDDIT_REQUEST_DELAY="1.5"
fly secrets set REDDIT_MAX_RETRIES="3"
fly secrets set REDDIT_MAX_POST_AGE_DAYS="1095"
```

### 4. Deploy the Application
```bash
fly deploy
```

Wait for deployment to complete (usually 2-5 minutes).

### 5. Check Deployment Status
```bash
fly status
```

### 6. View Logs (if needed)
```bash
fly logs
```

### 7. Get Your API URL
```bash
fly info
```

Your API will be available at: `https://your-app-name.fly.dev`

---

## Testing Your Deployed API

### Test Health Endpoint
```bash
curl https://your-app-name.fly.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "openai_configured": true
}
```

### Test Analyze Endpoint
```bash
curl -X POST https://your-app-name.fly.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}'
```

Or using PowerShell:
```powershell
$body = @{ company_name = "Greystar" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://your-app-name.fly.dev/analyze" `
  -Method Post -Body $body -ContentType "application/json"
```

---

## Updating Environment Variables

To update any secret:
```bash
fly secrets set OPENAI_API_KEY="new-key-here"
```

To list all secrets (values are hidden):
```bash
fly secrets list
```

---

## Scaling (if needed)

### Check Current Resources
```bash
fly scale show
```

### Scale Up Memory (if running out)
```bash
fly scale memory 1024  # Increase to 1GB
```

### Scale CPU
```bash
fly scale vm shared-cpu-2x  # 2 CPUs
```

### Auto-scaling (multiple instances)
```bash
fly scale count 2  # Run 2 instances
```

---

## Monitoring

### View App Dashboard
```bash
fly dashboard
```
Opens web dashboard at https://fly.io/apps/your-app-name

### View Metrics
```bash
fly dashboard metrics
```

### View Logs (live)
```bash
fly logs -f  # Follow logs in real-time
```

---

## Updating Your Application

After making code changes:

```bash
fly deploy
```

That's it! Fly.io will rebuild and redeploy automatically.

---

## CORS Configuration for Production

Before deploying, update CORS settings in `main.py`:

```python
# In main.py, find this section:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-extension-id.chromiumapp.org",  # Your Chrome extension
        "chrome-extension://your-extension-id",        # Chrome extension format
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

Replace `allow_origins=["*"]` with your actual Chrome extension ID.

---

## Cost Estimate

### Free Tier Includes:
- Up to 3 shared-cpu-1x VMs with 256MB RAM
- 160GB outbound data transfer per month
- Automatically scales to zero when idle

### Expected Costs:
- **Light usage** (< 100 requests/day): **FREE**
- **Moderate usage** (500-1000 requests/day): **~$2-5/month**
- **Heavy usage** (5000+ requests/day): **~$10-20/month**

Each API request:
- Takes ~15-25 seconds
- Uses ~100-200MB memory
- Processes 40 Reddit posts + OpenAI analysis

---

## Troubleshooting

### App won't start
```bash
fly logs
```
Check for errors in the logs.

### Out of memory errors
```bash
fly scale memory 1024
```

### OpenAI API errors
Check secrets are set:
```bash
fly secrets list
```

### Connection timeout
Increase machine memory or check Reddit/OpenAI API status.

### Need to restart
```bash
fly apps restart your-app-name
```

---

## Useful Commands

```bash
# SSH into your running app
fly ssh console

# Execute command in the app
fly ssh console -C "python --version"

# Open app in browser
fly open

# Open app dashboard
fly dashboard

# Destroy app (CAUTION!)
fly apps destroy your-app-name

# Check app status
fly status

# View all your apps
fly apps list
```

---

## Chrome Extension Integration

Once deployed, update your Chrome extension to use the new URL:

```javascript
const API_URL = 'https://your-app-name.fly.dev/analyze';

async function analyzeCompany(companyName) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}
```

---

## Security Best Practices

1. ✅ **Never commit `.env` file** - already in `.gitignore`
2. ✅ **Use Fly secrets** - for all sensitive data
3. ✅ **Restrict CORS** - only allow your Chrome extension origin
4. ✅ **Enable HTTPS** - already configured in `fly.toml`
5. ⚠️ **Add rate limiting** - consider for production
6. ⚠️ **Add API authentication** - optional but recommended

---

## Support

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Check logs first: `fly logs`

---

## Quick Reference Card

```bash
# Deploy
fly deploy

# View logs
fly logs -f

# Update secret
fly secrets set KEY="value"

# Scale memory
fly scale memory 1024

# Restart app
fly apps restart

# Open dashboard
fly dashboard

# Check status
fly status
```

---

## Next Steps After Deployment

1. Test all endpoints thoroughly
2. Update Chrome extension with new API URL
3. Set up monitoring alerts (optional)
4. Consider adding caching layer (Redis) for frequently searched companies
5. Monitor costs in Fly.io dashboard

Your API is now ready to deploy! 🚀

