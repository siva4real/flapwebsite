# Flap AI - Medical Chatbot

A modern medical chatbot powered by Grok AI (xAI). The backend is deployed on Render and the frontend is a simple web interface.

## 🏗️ Architecture

```
flapwebsite/
├── backend/              # FastAPI backend (deploy to Render)
│   ├── main.py          # FastAPI application
│   ├── requirements.txt # Python dependencies
│   ├── Dockerfile       # Docker configuration
│   └── test_api.py      # API testing script
└── frontend/            # Static website (deploy anywhere)
    ├── index.html       # Main HTML
    ├── script.js        # Frontend logic
    └── styles.css       # Styling
```

## 🚀 Backend Deployment (Render)

### Step 1: Prepare Your Backend

The `backend/` folder is ready for Render deployment.

### Step 2: Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository or upload the `backend` folder
4. Configure:
   - **Name:** `flap-ai-backend`
   - **Environment:** `Docker`
   - **Region:** Choose closest to your users
   - **Instance Type:** Free or Starter
5. Add Environment Variable:
   - **Key:** `GROK_API_KEY`
   - **Value:** Your Grok API key from [xAI Console](https://console.x.ai/)
6. Click **"Create Web Service"**

### Step 3: Get Your API URL

After deployment, Render will provide a URL like:
```
https://flap-ai-backend.onrender.com
```

## 📡 API Endpoints

Your deployed backend provides these endpoints:

### `GET /`
Health check endpoint
```bash
curl https://your-app.onrender.com/
```

### `GET /health`
Detailed health check
```bash
curl https://your-app.onrender.com/health
```

### `POST /api/chat`
Send a chat message and get AI response

**Request:**
```bash
curl -X POST https://your-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the symptoms of diabetes?",
    "conversation_history": []
  }'
```

**Response:**
```json
{
  "response": "Diabetes symptoms include increased thirst...",
  "success": true,
  "error": null
}
```

**With Conversation History:**
```bash
curl -X POST https://your-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about treatment",
    "conversation_history": [
      {
        "role": "user",
        "content": "What are the symptoms of diabetes?"
      },
      {
        "role": "assistant",
        "content": "Diabetes symptoms include..."
      }
    ]
  }'
```

## 🎨 Frontend Setup

### Option 1: Update API URL and Deploy

Edit `frontend/script.js` and update the API URL:

```javascript
const API_BASE_URL = 'https://your-app.onrender.com';
```

Then deploy the `frontend` folder to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting

### Option 2: Use Locally

1. Update `frontend/script.js` with your Render URL
2. Open `frontend/index.html` in a browser
3. Or serve with:
   ```bash
   cd frontend
   python -m http.server 8080
   ```

## 🔧 API Configuration

### Environment Variables (Render)

Set these in Render dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `GROK_API_KEY` | Your Grok API key from xAI | Yes |

### CORS Configuration

The backend allows all origins by default. For production, update `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📊 API Documentation

Once deployed, visit:
```
https://your-app.onrender.com/docs
```

This provides interactive API documentation (Swagger UI).

## 🧪 Testing Your API

### Using curl

```bash
# Health check
curl https://your-app.onrender.com/health

# Chat request
curl -X POST https://your-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "conversation_history": []}'
```

### Using the test script

```bash
cd backend
# Edit test_api.py and update BASE_URL to your Render URL
python test_api.py
```

### Using API Docs

Visit `https://your-app.onrender.com/docs` and use the interactive interface.

## 📝 Request/Response Examples

### Simple Chat Request

**Request:**
```json
{
  "message": "What is high blood pressure?",
  "conversation_history": []
}
```

**Response:**
```json
{
  "response": "High blood pressure (hypertension) is a condition where...",
  "success": true,
  "error": null
}
```

### Chat with Context

**Request:**
```json
{
  "message": "How can I prevent it?",
  "conversation_history": [
    {
      "role": "user",
      "content": "What is high blood pressure?"
    },
    {
      "role": "assistant",
      "content": "High blood pressure (hypertension) is..."
    }
  ]
}
```

**Response:**
```json
{
  "response": "To prevent high blood pressure, you can: 1) Maintain a healthy weight...",
  "success": true,
  "error": null
}
```

### Error Response

**Response:**
```json
{
  "response": "",
  "success": false,
  "error": "Request timeout. Please try again."
}
```

## 🔒 Security

- Never commit your `.env` file
- Keep your Grok API key secure
- Update CORS settings for production
- Monitor API usage on xAI dashboard

## 💰 Costs

- **Render:** Free tier available (with cold starts) or $7/month for always-on
- **Grok API:** Pay per request - check [xAI pricing](https://x.ai/pricing)

## 🐛 Troubleshooting

### Backend won't deploy on Render

- Check Dockerfile is present
- Verify `GROK_API_KEY` is set in environment variables
- Check Render logs for errors

### Frontend can't connect to backend

- Verify backend URL in `frontend/script.js`
- Check CORS settings in `backend/main.py`
- Ensure backend is running (visit `/health` endpoint)

### API returns 500 errors

- Check Grok API key is valid
- Verify xAI account has credits
- Check Render logs for detailed errors

## 🔗 Resources

- [Grok API Documentation](https://docs.x.ai/)
- [xAI Console](https://console.x.ai/)
- [Render Documentation](https://render.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## ⚠️ Disclaimer

This chatbot is for informational and educational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

---

**Backend Deploy:** Upload `backend/` folder to Render  
**Frontend Deploy:** Upload `frontend/` folder to any static host  
**API Documentation:** `https://your-app.onrender.com/docs`
