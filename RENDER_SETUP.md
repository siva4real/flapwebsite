# Deploy Backend to Render - Step by Step

## 📋 Prerequisites

1. Get your Grok API key from [xAI Console](https://console.x.ai/)
2. Have your `backend/` folder ready

## 🚀 Deployment Steps

### Step 1: Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up (free account available)
3. Verify your email

### Step 2: Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"**

### Step 3: Connect Your Code

You have 2 options:

**Option A: GitHub Repository (Recommended)**
1. Click "Connect GitHub"
2. Authorize Render to access your repos
3. Select your `flapwebsite` repository
4. Render will detect the Dockerfile

**Option B: Manual Upload**
1. Upload just the `backend/` folder as a zip
2. Or use Render's Git integration

### Step 4: Configure Your Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `flap-ai-backend` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (if using GitHub) |
| **Root Directory** | `backend` (if repo has multiple folders) |
| **Environment** | `Docker` |
| **Instance Type** | `Free` (or `Starter` for faster response) |

### Step 5: Add Environment Variables

In the **Environment Variables** section:

1. Click **"Add Environment Variable"**
2. **Key:** `GROK_API_KEY`
3. **Value:** Paste your Grok API key from xAI
4. Click **"Add"**

### Step 6: Deploy

1. Scroll down and click **"Create Web Service"**
2. Render will start building and deploying
3. Wait 3-5 minutes for first deployment

### Step 7: Get Your API URL

Once deployed, you'll see:
```
https://flap-ai-backend.onrender.com
```

Copy this URL - you'll need it for the frontend!

## ✅ Verify Deployment

### Test Health Endpoint

Visit in browser or use curl:
```bash
https://your-app-name.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "grok_api_configured": true,
  "api_version": "1.0.0"
}
```

### Test API Documentation

Visit:
```
https://your-app-name.onrender.com/docs
```

You should see the interactive Swagger UI.

### Test Chat Endpoint

```bash
curl -X POST https://your-app-name.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is diabetes?",
    "conversation_history": []
  }'
```

## 📝 Your Backend Files

Make sure these files are in your `backend/` folder:

```
backend/
├── main.py              ✓ FastAPI application
├── requirements.txt     ✓ Dependencies
├── Dockerfile          ✓ Docker configuration
├── .dockerignore       ✓ Docker ignore rules
├── .env.example        ✓ Environment template
└── .gitignore          ✓ Git ignore rules
```

## 🔧 Important Settings

### PORT Environment Variable

Render automatically sets the `PORT` environment variable. Your Dockerfile already uses port 8000, which Render will map correctly.

If you need to customize, update the Dockerfile CMD:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Health Check Path

Render will use `/health` to check if your service is running. This is already configured in `main.py`.

## 💰 Pricing

- **Free Tier:** 
  - 750 hours/month
  - Cold starts after 15 minutes of inactivity
  - Good for testing

- **Starter ($7/month):**
  - Always on
  - No cold starts
  - Better for production

## 🐛 Troubleshooting

### Build Failed

**Check Render logs:**
1. Go to your service dashboard
2. Click "Logs" tab
3. Look for error messages

**Common issues:**
- Missing files in `backend/` folder
- Typo in Dockerfile
- Python version mismatch

### Deploy Succeeded but Health Check Fails

**Verify:**
1. Check environment variables are set correctly
2. Verify `GROK_API_KEY` is present
3. Check logs for startup errors

### API Returns Errors

**Check:**
1. Grok API key is valid
2. xAI account has credits
3. View logs for detailed error messages

## 🔄 Updating Your Backend

After making changes:

**If using GitHub:**
1. Push changes to GitHub
2. Render auto-deploys (if enabled)
3. Or click "Manual Deploy" → "Deploy latest commit"

**If using manual upload:**
1. Go to service settings
2. Re-upload `backend/` folder
3. Render will rebuild

## 📊 Monitor Your Service

### View Logs
```
Dashboard → Your Service → Logs
```

### Check Metrics
```
Dashboard → Your Service → Metrics
```

Monitor:
- CPU usage
- Memory usage
- Request count
- Response times

## ✨ Next Steps

Once your backend is deployed and you have the URL:

1. ✅ Save your API URL (e.g., `https://flap-ai-backend.onrender.com`)
2. ⏭️ Update frontend `script.js` with this URL
3. 🚀 Deploy frontend to Netlify/Vercel

---

## 📞 Support

- **Render Docs:** https://render.com/docs
- **Render Support:** https://render.com/support
- **xAI Console:** https://console.x.ai/

---

**Ready?** Let me know your Render API URL once deployed, and I'll update the frontend!
