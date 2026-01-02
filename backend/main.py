"""
FastAPI backend for Flap AI Medical Chatbot
Integrates with multiple AI providers: Grok (xAI), OpenAI GPT, and Google Gemini
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import json
import random
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

# API configuration
GROK_API_KEY = os.getenv("GROK_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

# Available AI providers
PROVIDERS = []
if GROK_API_KEY:
    PROVIDERS.append("grok")
if OPENAI_API_KEY:
    PROVIDERS.append("openai")
if GEMINI_API_KEY:
    PROVIDERS.append("gemini")

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
    reasoning: Optional[str] = None
    provider: Optional[str] = None  # Which AI provider was used

# System prompt for medical chatbot
SYSTEM_PROMPT = """You are Flap AI, an expert medical assistant chatbot. Your role is to provide highly technical and accurate medical information to experts. 

You have to be as truth seeking as possible, unafraid to go against the norm only if your statement is logically backed up by the latest evidence.


You have to be very up-to-date with the latest medical research. You can include experimental or new treatments or drugs that are not yet approved by the FDA.

You have to be very precise and concise in your responses.
"""

# Helper functions for each AI provider

async def call_grok(messages: list, stream: bool = False):
    """Call Grok API"""
    if stream:
        # Return the stream context manager itself, don't use async with here
        client = httpx.AsyncClient(timeout=60.0)
        return client.stream(
            "POST",
            GROK_API_URL,
            headers={
                "Authorization": f"Bearer {GROK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "grok-3",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000,
                "stream": True
            }
        )
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROK_API_URL,
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-3",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                    "stream": False
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Grok API error")
            return response.json()


async def call_openai(messages: list, stream: bool = False):
    """Call OpenAI GPT API"""
    if stream:
        client = httpx.AsyncClient(timeout=60.0)
        return client.stream(
            "POST",
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000,
                "stream": True
            }
        )
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                    "stream": False
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="OpenAI API error")
            return response.json()


async def call_gemini(messages: list, stream: bool = False):
    """Call Google Gemini API"""
    # Convert messages to Gemini format
    contents = []
    for msg in messages:
        if msg["role"] == "system":
            # Add system message as first user message
            contents.append({
                "role": "user",
                "parts": [{"text": f"System instructions: {msg['content']}"}]
            })
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
    
    url = f"{GEMINI_API_URL}{'?alt=sse' if stream else ''}{'&' if stream else '?'}key={GEMINI_API_KEY}"
    
    if stream:
        client = httpx.AsyncClient(timeout=60.0)
        return client.stream(
            "POST",
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2000,
                }
            }
        )
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 2000,
                    }
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Gemini API error")
            return response.json()


def select_random_provider():
    """Select a random AI provider from available ones"""
    if not PROVIDERS:
        raise HTTPException(status_code=500, detail="No AI providers configured")
    return random.choice(PROVIDERS)

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
        "providers": {
            "grok": bool(GROK_API_KEY),
            "openai": bool(OPENAI_API_KEY),
            "gemini": bool(GEMINI_API_KEY)
        },
        "available_providers": PROVIDERS,
        "api_version": "1.0.0"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint that processes user messages and returns AI responses
    Uses random provider selection
    """
    
    # Check if any provider is available
    if not PROVIDERS:
        raise HTTPException(
            status_code=500,
            detail="No AI providers configured. Please set API keys in environment variables."
        )
    
    # Select random provider
    provider = select_random_provider()
    
    try:
        # Build messages array
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
        
        # Call the selected provider
        if provider == "grok":
            result = await call_grok(messages, stream=False)
            choice = result["choices"][0]
            ai_message = choice["message"]["content"]
            reasoning = choice.get("message", {}).get("reasoning")
            
        elif provider == "openai":
            result = await call_openai(messages, stream=False)
            choice = result["choices"][0]
            ai_message = choice["message"]["content"]
            reasoning = None  # OpenAI doesn't provide reasoning in the same way
            
        elif provider == "gemini":
            result = await call_gemini(messages, stream=False)
            ai_message = result["candidates"][0]["content"]["parts"][0]["text"]
            reasoning = None  # Gemini doesn't provide separate reasoning
        
        return ChatResponse(
            response=ai_message,
            success=True,
            reasoning=reasoning,
            provider=provider
        )
    
    except httpx.TimeoutException:
        return ChatResponse(
            response="",
            success=False,
            error="Request timeout. Please try again.",
            provider=provider
        )
    except httpx.RequestError as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"Network error: {str(e)}",
            provider=provider
        )
    except Exception as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"An error occurred: {str(e)}",
            provider=provider
        )

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming endpoint for real-time responses with Server-Sent Events
    Uses random provider selection
    """
    
    # Check if any provider is available
    if not PROVIDERS:
        raise HTTPException(
            status_code=500,
            detail="No AI providers configured"
        )
    
    # Select random provider
    provider = select_random_provider()
    
    async def generate():
        client = None
        try:
            # Build messages array
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            
            if request.conversation_history:
                messages.extend([
                    {"role": msg.role, "content": msg.content}
                    for msg in request.conversation_history
                ])
            
            messages.append({
                "role": "user",
                "content": request.message
            })
            
            # Send provider info
            yield f"data: {json.dumps({'provider': provider, 'done': False})}\n\n"
            
            # Call the selected provider with streaming
            if provider == "grok":
                stream_context = await call_grok(messages, stream=True)
                async with stream_context as response:
                    client = stream_context.__self__  # Get the client from context manager
                    if response.status_code != 200:
                        error_data = {"error": f"API error: {response.status_code}", "done": True}
                        yield f"data: {json.dumps(error_data)}\n\n"
                        return
                    
                    reasoning_content = ""
                    message_content = ""
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                final_data = {
                                    "content": "",
                                    "reasoning": reasoning_content if reasoning_content else None,
                                    "done": True
                                }
                                yield f"data: {json.dumps(final_data)}\n\n"
                                break
                            
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                
                                if "reasoning" in delta and delta["reasoning"]:
                                    reasoning_content += delta["reasoning"]
                                    yield f"data: {json.dumps({'reasoning': delta['reasoning'], 'done': False})}\n\n"
                                
                                if "content" in delta and delta["content"]:
                                    message_content += delta["content"]
                                    yield f"data: {json.dumps({'content': delta['content'], 'done': False})}\n\n"
                                    
                            except json.JSONDecodeError:
                                continue
            
            elif provider == "openai":
                stream_context = await call_openai(messages, stream=True)
                async with stream_context as response:
                    client = stream_context.__self__
                    if response.status_code != 200:
                        error_data = {"error": f"API error: {response.status_code}", "done": True}
                        yield f"data: {json.dumps(error_data)}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                yield f"data: {json.dumps({'done': True})}\n\n"
                                break
                            
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                
                                if "content" in delta and delta["content"]:
                                    yield f"data: {json.dumps({'content': delta['content'], 'done': False})}\n\n"
                                    
                            except json.JSONDecodeError:
                                continue
            
            elif provider == "gemini":
                stream_context = await call_gemini(messages, stream=True)
                async with stream_context as response:
                    client = stream_context.__self__
                    if response.status_code != 200:
                        error_data = {"error": f"API error: {response.status_code}", "done": True}
                        yield f"data: {json.dumps(error_data)}\n\n"
                        return
                    
                    previous_text = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            
                            try:
                                chunk = json.loads(data)
                                if "candidates" in chunk:
                                    # Gemini sends cumulative text, so we need to get the delta
                                    current_text = chunk["candidates"][0]["content"]["parts"][0].get("text", "")
                                    if current_text and current_text != previous_text:
                                        # Send only the new portion
                                        delta_text = current_text[len(previous_text):]
                                        if delta_text:
                                            yield f"data: {json.dumps({'content': delta_text, 'done': False})}\n\n"
                                        previous_text = current_text
                                
                                # Check if done
                                if chunk.get("candidates", [{}])[0].get("finishReason"):
                                    yield f"data: {json.dumps({'done': True})}\n\n"
                                    break
                                    
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            error_data = {
                "error": str(e),
                "done": True
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        finally:
            # Make sure to close the client
            if client:
                await client.aclose()
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
