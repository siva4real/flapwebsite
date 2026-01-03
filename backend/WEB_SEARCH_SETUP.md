# Web Search Setup Guide

This guide explains how to set up web search capabilities using LangChain, LangGraph, and DuckDuckGo Search.

## Overview

The web search feature allows Flap AI to search the internet for up-to-date medical information when answering questions. The AI automatically decides when to search based on the query.

**Key Benefits:**
- **Free**: DuckDuckGo search requires no API key or payment
- **No rate limits**: Reasonable usage without strict quotas
- **Privacy-focused**: DuckDuckGo doesn't track searches

## Architecture

```
User Query → LangGraph Agent → [Decides: Search needed?]
                                    ↓ Yes           ↓ No
                              DuckDuckGo Search   Direct LLM
                                    ↓              Response
                              Search Results
                                    ↓
                              LLM with Context → Response
```

## Required Environment Variables

Add these to your `.env` file:

```bash
# At least one of these LLM providers (Required)
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

**Note:** No API key is required for web search - DuckDuckGo is free!

## Getting Your API Keys

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys
3. Create a new secret key

### Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Get your API key from the API Keys section

## Installation

Install the required packages:

```bash
pip install -r requirements.txt
```

Or install them individually:

```bash
pip install langchain langchain-openai langchain-google-genai langchain-community langgraph duckduckgo-search
```

## API Endpoints

### 1. Chat with Web Search (Non-streaming)

**Endpoint:** `POST /api/chat/search`

**Request Body:**
```json
{
    "message": "What are the latest FDA-approved treatments for Alzheimer's?",
    "conversation_history": [],
    "conversation_id": null,
    "provider": "openai"
}
```

**Response:**
```json
{
    "response": "Based on recent FDA approvals...",
    "success": true,
    "search_performed": true,
    "provider": "openai",
    "conversation_id": "abc123"
}
```

### 2. Chat with Web Search (Streaming)

**Endpoint:** `POST /api/chat/search/stream`

Same request body as above. Returns Server-Sent Events (SSE):

```
data: {"provider": "openai", "conversation_id": "abc123", "type": "meta"}
data: {"search_status": "🔍 Searching: web_search", "done": false}
data: {"search_status": "Search complete", "done": false}
data: {"content": "Based on ", "done": false}
data: {"content": "recent ", "done": false}
...
data: {"done": true, "search_performed": true}
```

### 3. Web Search Health Check

**Endpoint:** `GET /api/search/health`

**Response:**
```json
{
    "status": "available",
    "web_search": {
        "engine": "DuckDuckGo",
        "available": true,
        "requires_api_key": false
    },
    "llm_providers": {
        "openai": true,
        "gemini": true
    },
    "packages": {
        "langchain": true,
        "langgraph": true,
        "duckduckgo_search": true
    },
    "message": "Web search is fully operational"
}
```

## Frontend Integration Example

```javascript
// Non-streaming request
async function chatWithSearch(message) {
    const response = await fetch('/api/chat/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            message: message,
            provider: 'openai'
        })
    });
    return response.json();
}

// Streaming request
async function chatWithSearchStream(message, onChunk) {
    const response = await fetch('/api/chat/search/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            message: message,
            provider: 'openai'
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                onChunk(data);
            }
        }
    }
}
```

## How the Agent Decides to Search

The LangGraph agent automatically decides to perform a web search when:

1. **Recent information is needed**: Questions about events, research, or approvals from the last 2 years
2. **Specific statistics requested**: Current prevalence rates, mortality data, etc.
3. **New drug information**: Latest approvals, clinical trials, side effects
4. **Treatment protocols**: Current guidelines, best practices
5. **Verification needed**: When the AI is uncertain about current facts

## Troubleshooting

### "No LLM API key configured"
- Ensure either `OPENAI_API_KEY` or `GEMINI_API_KEY` is set
- At least one LLM provider is required for the agent to work

### Search returns no results
- DuckDuckGo may have temporary rate limits if used excessively
- Try a broader search term
- Check your internet connection

### Import errors
- Make sure all packages are installed: `pip install -r requirements.txt`
- Try reinstalling: `pip install --upgrade duckduckgo-search`

## Cost Considerations

- **DuckDuckGo Search**: **FREE** - no API key required
- **OpenAI GPT-4**: Token-based pricing (more expensive)
- **Google Gemini**: Token-based pricing (generally cheaper)

The agent makes smart decisions about when to search, minimizing unnecessary API calls to LLM providers.
