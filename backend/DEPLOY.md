# Backend Deployment Checklist

## ✅ Pre-Deployment Checklist

Before uploading to Render, verify these files exist:

- [x] `main.py` - FastAPI application
- [x] `requirements.txt` - Python dependencies
- [x] `Dockerfile` - Docker configuration
- [x] `.dockerignore` - Docker ignore rules
- [x] `.gitignore` - Git ignore rules

## 📦 What to Upload to Render

Upload the entire `backend/` folder containing:
```
backend/
├── main.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example (optional)
└── test_api.py (optional)
```

**DO NOT upload:**
- `.env` file (add secrets in Render dashboard)
- `__pycache__/` folders
- `venv/` or `env/` folders

## 🔑 Required Configuration

### On Render Dashboard:

1. **Environment Variables:**
   ```
   GROK_API_KEY = your_actual_grok_api_key_here
   ```

2. **Service Settings:**
   - Environment: `Docker`
   - Region: Choose one (e.g., Oregon, Frankfurt, Singapore)
   - Instance Type: `Free` or `Starter`

3. **Root Directory (if using full repo):**
   ```
   backend
   ```

## 🎯 After Deployment

Once Render deploys your backend, you'll get a URL like:
```
https://flap-ai-backend-XXXX.onrender.com
```

### Test Your API:

1. **Health Check:**
   ```
   https://your-url.onrender.com/health
   ```

2. **API Documentation:**
   ```
   https://your-url.onrender.com/docs
   ```

3. **Test Chat:**
   ```bash
   curl -X POST https://your-url.onrender.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "conversation_history": []}'
   ```

## 📝 What to Send Me

After deployment, share:
```
My backend URL: https://your-app-name.onrender.com
```

I'll then update the frontend to use this URL!

## 🚀 Quick Deploy Steps

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click "New +" → "Web Service"
3. Upload `backend/` folder or connect GitHub
4. Set Environment: `Docker`
5. Add environment variable: `GROK_API_KEY`
6. Click "Create Web Service"
7. Wait 3-5 minutes
8. Copy your URL
9. Share with me!

---

**Need help?** Check `RENDER_SETUP.md` for detailed instructions.
