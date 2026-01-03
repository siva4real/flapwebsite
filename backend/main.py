"""
FastAPI backend for Flap AI Medical Chatbot
Integrates with multiple AI providers: Grok (xAI), OpenAI GPT, and Google Gemini
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import json
import random
from dotenv import load_dotenv
from datetime import datetime
from google.cloud import firestore

# Load environment variables
load_dotenv()

# Import authentication module
from auth import initialize_firebase, get_current_user, get_optional_user, get_firestore_client

# Initialize FastAPI app
app = FastAPI(
    title="Flap AI Medical Chatbot API",
    description="Backend API for medical chatbot using Grok AI",
    version="1.0.0"
)

# Initialize Firebase on startup
@app.on_event("startup")
async def startup_event():
    """Initialize Firebase Admin SDK on startup"""
    initialize_firebase()

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
    conversation_id: Optional[str] = None  # To continue existing conversation

class ChatResponse(BaseModel):
    response: str
    success: bool
    error: Optional[str] = None
    reasoning: Optional[str] = None
    provider: Optional[str] = None  # Which AI provider was used
    conversation_id: Optional[str] = None  # Return conversation ID

class ConversationSummary(BaseModel):
    id: str
    title: str
    last_message: str
    timestamp: str
    message_count: int

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

# Helper functions for chat history
def save_message_to_history(user_id: str, conversation_id: str, role: str, content: str, provider: Optional[str] = None):
    """Save a message to Firestore chat history"""
    try:
        db = get_firestore_client()
        if not db:
            return False
        
        message_data = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "provider": provider
        }
        
        # Add message to conversation's messages subcollection
        db.collection("users").document(user_id).collection("conversations").document(conversation_id).collection("messages").add(message_data)
        
        # Update conversation metadata
        conversation_ref = db.collection("users").document(user_id).collection("conversations").document(conversation_id)
        conversation_ref.set({
            "last_message": content[:100],  # First 100 chars
            "last_updated": datetime.utcnow().isoformat(),
            "message_count": firestore.Increment(1)
        }, merge=True)
        
        return True
    except Exception as e:
        print(f"Error saving message to history: {e}")
        return False

def create_conversation(user_id: str, first_message: str) -> Optional[str]:
    """Create a new conversation and return its ID"""
    try:
        db = get_firestore_client()
        if not db:
            return None
        
        # Generate title from first message (first 50 chars)
        title = first_message[:50] + "..." if len(first_message) > 50 else first_message
        
        conversation_data = {
            "title": title,
            "created_at": datetime.utcnow().isoformat(),
            "last_updated": datetime.utcnow().isoformat(),
            "last_message": first_message[:100],
            "message_count": 0
        }
        
        # Create conversation document
        _, doc_ref = db.collection("users").document(user_id).collection("conversations").add(conversation_data)
        return doc_ref.id
    except Exception as e:
        print(f"Error creating conversation: {e}")
        return None

def get_conversation_history(user_id: str, conversation_id: str) -> List[dict]:
    """Retrieve conversation history from Firestore"""
    try:
        db = get_firestore_client()
        if not db:
            return []
        
        messages_ref = db.collection("users").document(user_id).collection("conversations").document(conversation_id).collection("messages")
        messages = messages_ref.order_by("timestamp").stream()
        
        return [{"role": msg.get("role"), "content": msg.get("content")} for msg in messages]
    except Exception as e:
        print(f"Error retrieving conversation history: {e}")
        return []

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
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Main chat endpoint that processes user messages and returns AI responses
    Uses random provider selection
    Requires authentication.
    Saves chat history to Firestore.
    """
    
    # Check if any provider is available
    if not PROVIDERS:
        raise HTTPException(
            status_code=500,
            detail="No AI providers configured. Please set API keys in environment variables."
        )
    
    # Select random provider
    provider = select_random_provider()
    
    # Get or create conversation ID
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = create_conversation(current_user["uid"], request.message)
    
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
        
        # Save user message to history
        if conversation_id:
            save_message_to_history(current_user["uid"], conversation_id, "user", request.message)
        
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
        
        # Save AI response to history
        if conversation_id:
            save_message_to_history(current_user["uid"], conversation_id, "assistant", ai_message, provider)
        
        return ChatResponse(
            response=ai_message,
            success=True,
            reasoning=reasoning,
            provider=provider,
            conversation_id=conversation_id
        )
    
    except httpx.TimeoutException:
        return ChatResponse(
            response="",
            success=False,
            error="Request timeout. Please try again.",
            provider=provider,
            conversation_id=conversation_id
        )
    except httpx.RequestError as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"Network error: {str(e)}",
            provider=provider,
            conversation_id=conversation_id
        )
    except Exception as e:
        return ChatResponse(
            response="",
            success=False,
            error=f"An error occurred: {str(e)}",
            provider=provider,
            conversation_id=conversation_id
        )

@app.post("/api/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Streaming endpoint for real-time responses with Server-Sent Events
    Uses random provider selection
    Requires authentication.
    """
    
    # Check if any provider is available
    if not PROVIDERS:
        raise HTTPException(
            status_code=500,
            detail="No AI providers configured"
        )
    
    # Select random provider
    provider = select_random_provider()
    
    # Get or create conversation ID
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = create_conversation(current_user["uid"], request.message)
    
    # Save user message to history
    if conversation_id:
        save_message_to_history(current_user["uid"], conversation_id, "user", request.message)
    
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
    
    # Convert messages to Gemini format if needed
    gemini_contents = []
    if provider == "gemini":
        for msg in messages:
            if msg["role"] == "system":
                gemini_contents.append({
                    "role": "user",
                    "parts": [{"text": f"System instructions: {msg['content']}"}]
                })
            else:
                role = "user" if msg["role"] == "user" else "model"
                gemini_contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })
    
    async def generate():
        # Send provider and conversation info first
        yield f"data: {json.dumps({'provider': provider, 'conversation_id': conversation_id, 'done': False})}\n\n"
        
        full_response = ""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                if provider == "grok":
                    async with client.stream(
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
                    ) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'error': f'API error: {response.status_code}', 'done': True})}\n\n"
                            return
                        
                        reasoning_content = ""
                        
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data = line[6:]
                                if data == "[DONE]":
                                    yield f"data: {json.dumps({'reasoning': reasoning_content if reasoning_content else None, 'done': True})}\n\n"
                                    break
                                
                                try:
                                    chunk = json.loads(data)
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    
                                    if "reasoning" in delta and delta["reasoning"]:
                                        reasoning_content += delta["reasoning"]
                                        yield f"data: {json.dumps({'reasoning': delta['reasoning'], 'done': False})}\n\n"
                                    
                                    if "content" in delta and delta["content"]:
                                        full_response += delta["content"]
                                        yield f"data: {json.dumps({'content': delta['content'], 'done': False})}\n\n"
                                        
                                except json.JSONDecodeError:
                                    continue
                
                elif provider == "openai":
                    async with client.stream(
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
                    ) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'error': f'API error: {response.status_code}', 'done': True})}\n\n"
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
                                        full_response += delta["content"]
                                        yield f"data: {json.dumps({'content': delta['content'], 'done': False})}\n\n"
                                        
                                except json.JSONDecodeError:
                                    continue
                
                elif provider == "gemini":
                    url = f"{GEMINI_API_URL}?alt=sse&key={GEMINI_API_KEY}"
                    async with client.stream(
                        "POST",
                        url,
                        headers={"Content-Type": "application/json"},
                        json={
                            "contents": gemini_contents,
                            "generationConfig": {
                                "temperature": 0.7,
                                "maxOutputTokens": 2000,
                            }
                        }
                    ) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'error': f'API error: {response.status_code}', 'done': True})}\n\n"
                            return
                        
                        previous_text = ""
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data = line[6:]
                                
                                try:
                                    chunk = json.loads(data)
                                    if "candidates" in chunk:
                                        current_text = chunk["candidates"][0]["content"]["parts"][0].get("text", "")
                                        if current_text and current_text != previous_text:
                                            delta_text = current_text[len(previous_text):]
                                            if delta_text:
                                                full_response += delta_text
                                                yield f"data: {json.dumps({'content': delta_text, 'done': False})}\n\n"
                                            previous_text = current_text
                                    
                                    if chunk.get("candidates", [{}])[0].get("finishReason"):
                                        yield f"data: {json.dumps({'done': True})}\n\n"
                                        break
                                        
                                except json.JSONDecodeError:
                                    continue
                                
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
        
        # Save AI response to history after streaming completes
        if conversation_id and full_response:
            save_message_to_history(current_user["uid"], conversation_id, "assistant", full_response, provider)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for the current user"""
    try:
        db = get_firestore_client()
        if not db:
            return {"conversations": []}
        
        conversations_ref = db.collection("users").document(current_user["uid"]).collection("conversations")
        conversations = conversations_ref.order_by("last_updated", direction=firestore.Query.DESCENDING).limit(50).stream()
        
        result = []
        for conv in conversations:
            data = conv.to_dict()
            result.append({
                "id": conv.id,
                "title": data.get("title", "New Conversation"),
                "last_message": data.get("last_message", ""),
                "timestamp": data.get("last_updated", ""),
                "message_count": data.get("message_count", 0)
            })
        
        return {"conversations": result}
    except Exception as e:
        print(f"Error retrieving conversations: {e}")
        return {"conversations": []}

@app.get("/api/conversations/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages in a conversation"""
    try:
        messages = get_conversation_history(current_user["uid"], conversation_id)
        return {"messages": messages, "conversation_id": conversation_id}
    except Exception as e:
        print(f"Error retrieving conversation messages: {e}")
        return {"messages": [], "conversation_id": conversation_id}

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a conversation"""
    try:
        db = get_firestore_client()
        if not db:
            return {"success": False, "message": "Database not available"}
        
        # Delete all messages in the conversation
        messages_ref = db.collection("users").document(current_user["uid"]).collection("conversations").document(conversation_id).collection("messages")
        messages = messages_ref.stream()
        for msg in messages:
            msg.reference.delete()
        
        # Delete the conversation document
        db.collection("users").document(current_user["uid"]).collection("conversations").document(conversation_id).delete()
        
        return {"success": True, "message": "Conversation deleted"}
    except Exception as e:
        print(f"Error deleting conversation: {e}")
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
