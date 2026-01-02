"""
FastAPI backend for Flap AI Medical Chatbot
Integrates with Grok API (xAI) for chat responses
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Flap AI Medical Chatbot API",
    description="Backend API for medical chatbot using Grok AI",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Grok API configuration
GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"

# Pydantic models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    response: str
    success: bool
    error: Optional[str] = None

# System prompt for medical chatbot
SYSTEM_PROMPT = """You are Flap AI, an expert medical assistant chatbot. Your role is to provide helpful, accurate, and empathetic medical information to users.

Key guidelines:
1. Provide clear, evidence-based medical information
2. Be empathetic and understanding
3. Always remind users that you're not a replacement for professional medical advice
4. For serious symptoms or concerns, encourage users to consult healthcare professionals
5. Use simple language that's easy to understand
6. When discussing medications or treatments, mention the importance of consulting with a doctor
7. Be thorough but concise in your responses

Remember: You're here to educate and inform, not to diagnose or prescribe treatment."""

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Flap AI Medical Chatbot API is running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "grok_api_configured": bool(GROK_API_KEY),
        "api_version": "1.0.0"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint that processes user messages and returns AI responses
    """
    
    # Validate API key
    if not GROK_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Grok API key not configured. Please set GROK_API_KEY in environment variables."
        )
    
    try:
        # Build messages array for Grok API
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Add conversation history if provided
        if request.conversation_history:
            messages.extend([
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ])
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Call Grok API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROK_API_URL,
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-3",  # Use the appropriate Grok model
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "stream": False
                }
            )
            
            # Check for API errors
            if response.status_code != 200:
                error_detail = response.json() if response.text else "Unknown error"
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Grok API error: {error_detail}"
                )
            
            # Parse response
            grok_response = response.json()
            ai_message = grok_response["choices"][0]["message"]["content"]
            
            return ChatResponse(
                response=ai_message,
                success=True
            )
    
    except httpx.TimeoutException:
        return ChatResponse(
            response="",
            success=False,
            error="Request timeout. Please try again."
        )
    except httpx.RequestError as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"Network error: {str(e)}"
        )
    except Exception as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"An error occurred: {str(e)}"
        )

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming endpoint for real-time responses (future enhancement)
    """
    raise HTTPException(
        status_code=501,
        detail="Streaming not implemented yet"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
