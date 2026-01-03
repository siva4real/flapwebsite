"""
Web Search Agent using LangChain, LangGraph, and DuckDuckGo Search
Provides web search capabilities for up-to-date medical information
"""

import os
from typing import Annotated, TypedDict, List, Optional
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

# DuckDuckGo search - free, no API key required
from langchain_community.tools import DuckDuckGoSearchResults
from duckduckgo_search import DDGS

load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


class AgentState(TypedDict):
    """State for the web search agent graph"""
    messages: Annotated[List[BaseMessage], add_messages]
    search_results: Optional[str]
    final_response: Optional[str]


def create_web_search_tool():
    """Create a DuckDuckGo web search tool - free, no API key required"""
    
    @tool
    def web_search(query: str) -> str:
        """
        Search the web for current information using DuckDuckGo.
        Use this tool when you need up-to-date information about medical topics,
        recent research, drug approvals, clinical trials, or any current events.
        
        Args:
            query: The search query to look up
            
        Returns:
            Search results with titles, snippets, and URLs
        """
        try:
            # Use DuckDuckGo search
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))
            
            if not results:
                return f"No results found for: {query}"
            
            # Format results
            formatted_results = []
            for i, result in enumerate(results, 1):
                title = result.get("title", "No title")
                body = result.get("body", "No description")
                href = result.get("href", "")
                formatted_results.append(
                    f"{i}. **{title}**\n   {body}\n   Source: {href}\n"
                )
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Search error: {str(e)}"
    
    return web_search


def get_llm(provider: str = "openai"):
    """Get the LLM based on the provider"""
    if provider == "openai" and OPENAI_API_KEY:
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
        raise ValueError("No LLM API key configured. Please set OPENAI_API_KEY or GEMINI_API_KEY.")


# Medical assistant system prompt with web search capabilities
MEDICAL_SEARCH_SYSTEM_PROMPT = """You are Flap AI, an expert medical assistant chatbot with web search capabilities.

Your role is to provide highly technical and accurate medical information to experts.

**Important Guidelines:**
1. You have access to a web search tool. Use it proactively to:
   - Find the latest medical research and clinical trials
   - Look up recent drug approvals or FDA decisions
   - Verify current treatment guidelines
   - Get up-to-date statistics and epidemiological data
   - Research new or experimental treatments

2. Be truth-seeking and evidence-based:
   - Don't be afraid to go against conventional wisdom if evidence supports it
   - Always cite your sources when using web search results
   - Distinguish between established facts and emerging research

3. Communication style:
   - Be precise and concise
   - Use medical terminology appropriately for expert audiences
   - Structure complex information clearly

4. When to search:
   - Recent developments (last 2 years)
   - Specific statistics or data
   - New drug information
   - Latest treatment protocols
   - Verification of current guidelines

Always be transparent about what information comes from web searches versus your training data."""


def create_web_search_agent(provider: str = "openai"):
    """
    Create a LangGraph agent with web search capabilities.
    
    Args:
        provider: The LLM provider to use ("openai" or "gemini")
        
    Returns:
        A compiled LangGraph agent
    """
    # Initialize LLM with tools
    llm = get_llm(provider)
    search_tool = create_web_search_tool()
    tools = [search_tool]
    
    # Bind tools to the LLM
    llm_with_tools = llm.bind_tools(tools)
    
    # Define the agent node
    def agent_node(state: AgentState) -> AgentState:
        """Process messages and decide whether to search or respond"""
        messages = state["messages"]
        
        # Add system prompt if not present
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=MEDICAL_SEARCH_SYSTEM_PROMPT)] + list(messages)
        
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
    provider: str = "openai"
) -> dict:
    """
    Process a user message with web search capabilities.
    
    Args:
        message: The user's message
        conversation_history: Previous messages in the conversation
        provider: The LLM provider to use
        
    Returns:
        A dictionary with the response and metadata
    """
    try:
        # Create the agent
        agent = create_web_search_agent(provider)
        
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
    provider: str = "openai"
):
    """
    Stream a response with web search capabilities.
    
    Args:
        message: The user's message
        conversation_history: Previous messages in the conversation
        provider: The LLM provider to use
        
    Yields:
        Chunks of the response
    """
    try:
        # Create the agent
        agent = create_web_search_agent(provider)
        
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


# Simple test function
if __name__ == "__main__":
    import asyncio
    
    async def test():
        result = await search_and_respond(
            "What are the latest FDA-approved treatments for Alzheimer's disease in 2024?",
            provider="openai"
        )
        print(result)
    
    asyncio.run(test())
