# Flap AI - Medical Chatbot

A modern medical chatbot powered by Grok AI (xAI).

## 🎉 Live Backend

**API URL:** https://flapwebsite.onrender.com

**API Docs:** https://flapwebsite.onrender.com/docs

## 🏗️ Architecture

```
Frontend (Static Web) → Backend API (Render) → Grok AI (xAI)
```

## 📁 Project Structure

```
flapwebsite/
├── backend/              # Backend API (deployed to Render)
│   ├── main.py          # FastAPI application
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Docker configuration
└── frontend/            # Frontend website (ready to deploy)
    ├── index.html       # Main page
    ├── script.js        # Frontend logic (configured with API URL)
    └── styles.css       # Styling
```

## 🚀 Quick Start

### Frontend Setup

The frontend is already configured to use your live backend API.

**Deploy Options:**

1. **Netlify** (Easiest)
   - Go to https://app.netlify.com/
   - Drag & drop the `frontend/` folder
   - Done!

2. **Vercel**
   - Go to https://vercel.com
   - Import and deploy `frontend/` folder

3. **GitHub Pages**
   - Push to GitHub
   - Enable Pages in settings

4. **Test Locally**
   ```bash
   cd frontend
   python -m http.server 8080
   ```
   Visit: http://localhost:8080

## 📡 API Endpoints

### `GET /health`
Health check endpoint
```bash
curl https://flapwebsite.onrender.com/health
```

### `POST /api/chat`
Send a chat message and get AI response

**Request:**
```json
{
  "message": "What are the symptoms of diabetes?",
  "conversation_history": []
}
```

**Response:**
```json
{
  "response": "AI-generated medical information...",
  "success": true,
  "error": null
}
```

### `GET /docs`
Interactive API documentation (Swagger UI)
```
https://flapwebsite.onrender.com/docs
```

## 🧪 Testing

### Test Backend API

```bash
curl -X POST https://flapwebsite.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is diabetes?",
    "conversation_history": []
  }'
```

### Test Complete Flow

1. Open frontend (deployed or local)
2. Type a question
3. See AI response from Grok

## 🔧 Configuration

### Backend (Already Deployed)
- **Platform:** Render
- **URL:** https://flapwebsite.onrender.com
- **Model:** grok-3
- **Environment Variables:** Set in Render dashboard

### Frontend (Ready to Deploy)
- **API URL:** Already configured in `script.js`
- **Features:** Dark/light theme, conversation history, responsive design

## 💰 Costs

- **Render Free Tier:** Backend sleeps after 15 min (first request slow)
- **Render Starter ($7/mo):** Always on, no cold starts
- **Grok API:** Pay per request at xAI

## 📚 Documentation

- **API Docs:** https://flapwebsite.onrender.com/docs
- **Deployment Success:** See `DEPLOYMENT_SUCCESS.md`
- **Render Setup:** See `RENDER_SETUP.md`

## 🔗 Resources

- [Grok API Documentation](https://docs.x.ai/)
- [xAI Console](https://console.x.ai/)
- [Render Dashboard](https://dashboard.render.com/)

## ⚠️ Disclaimer

This chatbot is for informational and educational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.

---

**Backend:** ✅ Live at https://flapwebsite.onrender.com  
**Frontend:** ⏳ Ready to deploy from `frontend/` folder
