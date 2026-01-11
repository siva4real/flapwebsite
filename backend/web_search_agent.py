"""
Web Search Agent using LangChain, LangGraph, and multiple search engines
Provides web search capabilities for up-to-date medical information

Supported LLM providers:
- Grok (xAI) - requires GROK_API_KEY
- OpenAI GPT - requires OPENAI_API_KEY
- Google Gemini - requires GEMINI_API_KEY

Supported search engines:
- DuckDuckGo (free, no API key required)
- Tavily (requires TAVILY_API_KEY, optimized for AI agents)
"""

import os
from datetime import datetime
from typing import Annotated, TypedDict, List, Optional, Literal
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

# DuckDuckGo search - free, no API key required
DDGS_AVAILABLE = False
try:
    from ddgs import DDGS
    DDGS_AVAILABLE = True
    print(f"[WebSearch] DuckDuckGo search initialized successfully")
except ImportError as e:
    print(f"Warning: ddgs package not installed: {e}")

# Tavily search - requires API key, optimized for AI
TAVILY_AVAILABLE = False
TavilyClient = None
try:
    from tavily import TavilyClient as _TavilyClient
    TavilyClient = _TavilyClient
    TAVILY_AVAILABLE = True
    print(f"[WebSearch] Tavily search initialized successfully")
except ImportError as e:
    print(f"Warning: tavily-python package not installed: {e}")

load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Grok API URL (OpenAI-compatible)
GROK_API_URL = "https://api.x.ai/v1"

# Search engine type
SearchEngine = Literal["duckduckgo", "tavily", "auto"]


class AgentState(TypedDict):
    """State for the web search agent graph"""
    messages: Annotated[List[BaseMessage], add_messages]
    search_results: Optional[str]
    final_response: Optional[str]


def _search_with_duckduckgo(query: str, max_results: int = 5) -> str:
    """Perform search using DuckDuckGo"""
    if not DDGS_AVAILABLE:
        return "Search error: ddgs package not installed"
    
    try:
        ddgs = DDGS()
        results = list(ddgs.text(
            query,
            max_results=max_results,
            region='wt-wt',  # Worldwide
            safesearch='moderate'
        ))
        
        print(f"[DuckDuckGo] Found {len(results)} results")
        
        if not results:
            return f"No results found for: {query}"
        
        # Format results with current date context
        today = datetime.now().strftime("%B %d, %Y")
        formatted_results = [f"Search performed on {today} using DuckDuckGo:\n"]
        
        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            body = result.get("body", "No description")
            href = result.get("href", "")
            formatted_results.append(
                f"{i}. **{title}**\n   {body}\n   Source: {href}\n"
            )
        
        return "\n".join(formatted_results)
        
    except Exception as e:
        print(f"[DuckDuckGo] Error: {str(e)}")
        return f"DuckDuckGo search error: {str(e)}"


def _search_with_tavily(query: str, max_results: int = 5) -> str:
    """Perform search using Tavily - optimized for AI agents"""
    if not TAVILY_AVAILABLE:
        return "Search error: tavily-python package not installed"
    
    if not TAVILY_API_KEY:
        return "Search error: TAVILY_API_KEY not configured"
    
    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        
        # Tavily search with medical/scientific focus
        response = client.search(
            query=query,
            search_depth="advanced",  # More thorough search
            max_results=max_results,
            include_answer=True,  # Get AI-generated answer summary
            include_raw_content=False,
            include_domains=[],  # No domain restrictions
            exclude_domains=[]
        )
        
        results = response.get("results", [])
        answer = response.get("answer", "")
        
        print(f"[Tavily] Found {len(results)} results")
        
        if not results:
            return f"No results found for: {query}"
        
        # Format results with current date context
        today = datetime.now().strftime("%B %d, %Y")
        formatted_results = [f"Search performed on {today} using Tavily:\n"]
        
        # Include Tavily's AI-generated answer if available
        if answer:
            formatted_results.append(f"**Quick Answer:** {answer}\n")
        
        formatted_results.append("**Sources:**\n")
        
        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            content = result.get("content", "No description")
            url = result.get("url", "")
            score = result.get("score", 0)
            
            # Tavily provides relevance scores
            relevance = f" (relevance: {score:.2f})" if score else ""
            formatted_results.append(
                f"{i}. **{title}**{relevance}\n   {content[:300]}{'...' if len(content) > 300 else ''}\n   Source: {url}\n"
            )
        
        return "\n".join(formatted_results)
        
    except Exception as e:
        print(f"[Tavily] Error: {str(e)}")
        return f"Tavily search error: {str(e)}"


def get_best_search_engine() -> str:
    """Determine the best available search engine"""
    # Prefer Tavily if configured (better for AI agents)
    if TAVILY_AVAILABLE and TAVILY_API_KEY:
        return "tavily"
    # Fall back to DuckDuckGo (free, no API key)
    if DDGS_AVAILABLE:
        return "duckduckgo"
    return "none"


def create_web_search_tool(search_engine: SearchEngine = "auto"):
    """
    Create a web search tool using the specified search engine.
    
    Args:
        search_engine: Which search engine to use
            - "duckduckgo": Free, no API key required
            - "tavily": Requires API key, optimized for AI agents
            - "auto": Automatically select best available (prefers Tavily)
    
    Returns:
        A LangChain tool for web search
    """
    # Determine which engine to use
    if search_engine == "auto":
        engine = get_best_search_engine()
    else:
        engine = search_engine
    
    print(f"[WebSearch] Using search engine: {engine}")
    
    @tool
    def web_search(query: str) -> str:
        """
        Search the web for current information.
        Use this tool ALWAYS when you need:
        - Up-to-date information about medical topics
        - Recent research, drug approvals, or FDA decisions
        - Clinical trials or new treatments
        - Current events or recent news
        - Any information from 2024 or 2025
        
        Args:
            query: The search query to look up
            
        Returns:
            Search results with titles, snippets, and URLs
        """
        print(f"[WebSearch] Searching for: {query}")
        
        if engine == "tavily":
            return _search_with_tavily(query)
        elif engine == "duckduckgo":
            return _search_with_duckduckgo(query)
        else:
            # Try both as fallback
            if TAVILY_AVAILABLE and TAVILY_API_KEY:
                return _search_with_tavily(query)
            elif DDGS_AVAILABLE:
                return _search_with_duckduckgo(query)
            else:
                return "Search error: No search engine available. Install ddgs or tavily-python package."
    
    return web_search


def get_llm(provider: str = "openai"):
    """Get the LLM based on the provider"""
    if provider == "grok" and GROK_API_KEY:
        # Grok uses OpenAI-compatible API
        return ChatOpenAI(
            model="grok-3",
            temperature=0.7,
            api_key=GROK_API_KEY,
            base_url=GROK_API_URL
        )
    elif provider == "openai" and OPENAI_API_KEY:
        return ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=OPENAI_API_KEY
        )
    elif provider == "gemini" and GEMINI_API_KEY:
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            temperature=0.7,
            google_api_key=GEMINI_API_KEY
        )
    # Fallback: try any available provider
    elif GROK_API_KEY:
        return ChatOpenAI(
            model="grok-3",
            temperature=0.7,
            api_key=GROK_API_KEY,
            base_url=GROK_API_URL
        )
    elif OPENAI_API_KEY:
        return ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=OPENAI_API_KEY
        )
    elif GEMINI_API_KEY:
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            temperature=0.7,
            google_api_key=GEMINI_API_KEY
        )
    else:
        raise ValueError("No LLM API key configured. Please set GROK_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.")


def get_system_prompt():
    """Generate system prompt with current date"""
    today = datetime.now().strftime("%B %d, %Y")
    current_year = datetime.now().year
    
    return f"""You are Flap AI, an expert medical assistant chatbot with web search capabilities.

**TODAY'S DATE: {today}**

Your role is to provide highly technical and accurate medical information to experts.

**CRITICAL: You MUST use the web_search tool for:**
- ANY question about recent events, news, or developments
- Questions about {current_year} or {current_year - 1} information
- Drug approvals, FDA decisions, or regulatory changes
- Latest treatment guidelines or protocols
- Current statistics, prevalence rates, or epidemiological data
- New research, clinical trials, or studies
- Anything the user asks about that might have changed recently

**Guidelines:**
1. ALWAYS search first when the question involves recent/current/latest information
2. Your training data may be outdated - use web search to get current information
3. Cite your sources from the search results
4. Be transparent about what comes from search vs your knowledge

**Communication style:**
- Be precise and concise
- Use medical terminology appropriately for expert audiences
- Structure complex information clearly
- Include relevant dates from your search results

Remember: Today is {today}. If someone asks about "recent" or "latest" developments, search the web to provide current {current_year} information."""


def create_web_search_agent(provider: str = "openai", search_engine: SearchEngine = "auto"):
    """
    Create a LangGraph agent with web search capabilities.
    
    Args:
        provider: The LLM provider to use ("openai" or "gemini")
        search_engine: Which search engine to use ("duckduckgo", "tavily", or "auto")
        
    Returns:
        A compiled LangGraph agent
    """
    # Initialize LLM with tools
    llm = get_llm(provider)
    search_tool = create_web_search_tool(search_engine)
    tools = [search_tool]
    
    # Bind tools to the LLM
    llm_with_tools = llm.bind_tools(tools)
    
    # Define the agent node
    def agent_node(state: AgentState) -> AgentState:
        """Process messages and decide whether to search or respond"""
        messages = state["messages"]
        
        # Add system prompt with current date if not present
        if not messages or not isinstance(messages[0], SystemMessage):
            system_prompt = get_system_prompt()
            messages = [SystemMessage(content=system_prompt)] + list(messages)
        
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}
    
    # Define the tool node
    tool_node = ToolNode(tools)
    
    # Define the routing function
    def should_continue(state: AgentState) -> str:
        """Determine if the agent should continue with tools or finish"""
        messages = state["messages"]
        last_message = messages[-1]
        
        # If there are tool calls, continue to tools
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        
        # Otherwise, finish
        return END
    
    # Build the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # Add edges
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END
        }
    )
    workflow.add_edge("tools", "agent")
    
    # Compile the graph
    return workflow.compile()


def extract_sources_from_tool_result(tool_content: str) -> List[dict]:
    """Extract source URLs from tool search results"""
    import re
    sources = []
    
    # Pattern to match: title followed by description and Source: URL
    # Format: "1. **Title**\n   Description\n   Source: URL"
    lines = tool_content.split('\n')
    current_source = {}
    
    for line in lines:
        line = line.strip()
        
        # Match numbered title: "1. **Title**"
        title_match = re.match(r'^\d+\.\s+\*\*(.+?)\*\*', line)
        if title_match:
            if current_source:
                sources.append(current_source)
            current_source = {"title": title_match.group(1), "snippet": "", "url": ""}
            continue
        
        # Match Source: URL
        source_match = re.match(r'^Source:\s*(.+)$', line)
        if source_match and current_source:
            current_source["url"] = source_match.group(1).strip()
            continue
        
        # Everything else is snippet/description
        if current_source and line and not line.startswith('Source:'):
            if current_source["snippet"]:
                current_source["snippet"] += " " + line
            else:
                current_source["snippet"] = line
    
    # Don't forget the last source
    if current_source and current_source.get("url"):
        sources.append(current_source)
    
    return sources


async def search_and_respond(
    message: str,
    conversation_history: List[dict] = None,
    provider: str = "openai",
    search_engine: SearchEngine = "auto"
) -> dict:
    """
    Process a user message with web search capabilities.
    
    Args:
        message: The user's message
        conversation_history: Previous messages in the conversation
        provider: The LLM provider to use
        search_engine: Which search engine to use ("duckduckgo", "tavily", or "auto")
        
    Returns:
        A dictionary with the response and metadata
    """
    try:
        # Create the agent
        agent = create_web_search_agent(provider, search_engine)
        
        # Build messages
        messages = []
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Add current message
        messages.append(HumanMessage(content=message))
        
        # Run the agent
        result = agent.invoke({"messages": messages})
        
        # Extract the final response and sources
        final_messages = result["messages"]
        ai_message = None
        search_performed = False
        sources = []
        
        # Find the last AI message and check if search was performed
        for msg in final_messages:
            if isinstance(msg, AIMessage):
                if msg.content:  # Skip tool call messages without content
                    ai_message = msg
            # Check for tool messages (search results)
            if hasattr(msg, "type") and msg.type == "tool":
                search_performed = True
                # Extract sources from tool result
                if hasattr(msg, "content") and msg.content:
                    sources.extend(extract_sources_from_tool_result(msg.content))
        
        if ai_message:
            return {
                "response": ai_message.content,
                "success": True,
                "search_performed": search_performed,
                "sources": sources,
                "provider": provider
            }
        else:
            return {
                "response": "I apologize, but I couldn't generate a response. Please try again.",
                "success": False,
                "error": "No response generated",
                "sources": []
            }
            
    except Exception as e:
        return {
            "response": "",
            "success": False,
            "error": str(e),
            "sources": []
        }


async def search_and_respond_stream(
    message: str,
    conversation_history: List[dict] = None,
    provider: str = "openai",
    search_engine: SearchEngine = "auto"
):
    """
    Stream a response with web search capabilities.
    
    Args:
        message: The user's message
        conversation_history: Previous messages in the conversation
        provider: The LLM provider to use
        search_engine: Which search engine to use ("duckduckgo", "tavily", or "auto")
        
    Yields:
        Chunks of the response
    """
    try:
        # Create the agent
        agent = create_web_search_agent(provider, search_engine)
        
        # Build messages
        messages = []
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Add current message
        messages.append(HumanMessage(content=message))
        
        # Stream the agent response
        search_performed = False
        sources = []
        search_query = ""
        
        async for event in agent.astream_events(
            {"messages": messages},
            version="v2"
        ):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield {"type": "content", "data": content}
                    
            elif kind == "on_tool_start":
                tool_name = event.get("name", "tool")
                # Try to get the search query from the event
                tool_input = event.get("data", {}).get("input", {})
                if isinstance(tool_input, dict):
                    search_query = tool_input.get("query", "")
                yield {"type": "tool_start", "data": search_query or "web"}
                search_performed = True
                
            elif kind == "on_tool_end":
                # Extract sources from tool output
                tool_output = event.get("data", {}).get("output", "")
                if tool_output:
                    sources.extend(extract_sources_from_tool_result(str(tool_output)))
                yield {"type": "tool_end", "data": "Search complete", "sources": sources}
        
        yield {"type": "done", "search_performed": search_performed, "sources": sources}
        
    except Exception as e:
        yield {"type": "error", "data": str(e)}


def get_available_search_engines() -> dict:
    """Get information about available search engines"""
    return {
        "duckduckgo": {
            "available": DDGS_AVAILABLE,
            "requires_api_key": False,
            "description": "Free search engine, no API key required"
        },
        "tavily": {
            "available": TAVILY_AVAILABLE and bool(TAVILY_API_KEY),
            "configured": bool(TAVILY_API_KEY),
            "package_installed": TAVILY_AVAILABLE,
            "requires_api_key": True,
            "description": "AI-optimized search with relevance scoring and answer summaries"
        },
        "recommended": get_best_search_engine()
    }


# Simple test function
if __name__ == "__main__":
    import asyncio
    
    async def test_duckduckgo():
        """Test DuckDuckGo search"""
        print("=" * 60)
        print("Testing DuckDuckGo search...")
        print("=" * 60)
        search_tool = create_web_search_tool("duckduckgo")
        result = search_tool.invoke("latest FDA drug approvals 2025")
        print("Search Result:")
        print(result)
        print("-" * 50)
    
    async def test_tavily():
        """Test Tavily search"""
        print("=" * 60)
        print("Testing Tavily search...")
        print("=" * 60)
        if not TAVILY_API_KEY:
            print("TAVILY_API_KEY not configured, skipping Tavily test")
            return
        
        search_tool = create_web_search_tool("tavily")
        result = search_tool.invoke("latest FDA drug approvals 2025")
        print("Search Result:")
        print(result)
        print("-" * 50)
    
    async def test_auto():
        """Test auto search engine selection"""
        print("=" * 60)
        print("Testing AUTO search engine selection...")
        print("=" * 60)
        engines = get_available_search_engines()
        print(f"Available engines: {engines}")
        print(f"Recommended engine: {engines['recommended']}")
        
        search_tool = create_web_search_tool("auto")
        result = search_tool.invoke("latest FDA drug approvals 2025")
        print("Search Result:")
        print(result)
        print("-" * 50)
    
    async def test_agent():
        """Test the full agent"""
        print("=" * 60)
        print("Testing full agent with auto search...")
        print("=" * 60)
        result = await search_and_respond(
            "What are the latest FDA-approved treatments for Alzheimer's disease?",
            provider="openai",
            search_engine="auto"
        )
        print("Agent Result:")
        print(f"Success: {result.get('success')}")
        print(f"Search performed: {result.get('search_performed')}")
        print(f"Sources: {len(result.get('sources', []))}")
        print(f"Response preview: {result.get('response', '')[:500]}...")
    
    async def main():
        print("\n" + "=" * 60)
        print("WEB SEARCH AGENT TEST SUITE")
        print("=" * 60 + "\n")
        
        # Show available engines
        engines = get_available_search_engines()
        print("Available Search Engines:")
        for name, info in engines.items():
            if name != "recommended":
                status = "[OK] Available" if info.get('available') else "[X] Not available"
                print(f"  - {name}: {status}")
        print(f"  - Recommended: {engines['recommended']}")
        print()
        
        await test_duckduckgo()
        await test_tavily()
        await test_auto()
        await test_agent()
    
    asyncio.run(main())
