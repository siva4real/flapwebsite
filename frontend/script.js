// Theme Management
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const newChatBtn = document.getElementById('newChatBtn');
const welcomeScreen = document.getElementById('welcomeScreen');

// Auto-resize textarea
const autoResizeTextarea = () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
};

messageInput.addEventListener('input', autoResizeTextarea);

// Format markdown-style text to HTML
const formatText = (text) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // Split into lines for processing
    let lines = text.split('\n');
    let html = '';
    let inList = false;
    let inCodeBlock = false;
    let codeBlockContent = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Code blocks (```)
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockContent = '';
                continue;
            } else {
                inCodeBlock = false;
                html += `<pre><code>${escapeHtml(codeBlockContent)}</code></pre>`;
                codeBlockContent = '';
                continue;
            }
        }

        if (inCodeBlock) {
            codeBlockContent += line + '\n';
            continue;
        }

        // Headers (###, ##, #)
        if (line.match(/^#{1,3}\s/)) {
            const level = line.match(/^#+/)[0].length;
            const text = line.replace(/^#+\s/, '');
            html += `<h${level + 2}>${escapeHtml(text)}</h${level + 2}>`;
            continue;
        }

        // Unordered lists (-, *, •)
        if (line.match(/^\s*[-*•]\s/)) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            const text = line.replace(/^\s*[-*•]\s/, '');
            html += `<li>${formatInlineStyles(text)}</li>`;
            continue;
        }

        // Numbered lists (1., 2., etc)
        if (line.match(/^\s*\d+\.\s/)) {
            if (!inList) {
                html += '<ol>';
                inList = true;
            }
            const text = line.replace(/^\s*\d+\.\s/, '');
            html += `<li>${formatInlineStyles(text)}</li>`;
            continue;
        }

        // Close list if we were in one
        if (inList && !line.match(/^\s*[-*•\d]/)) {
            html += inList === 'ul' ? '</ul>' : '</ol>';
            inList = false;
        }

        // Empty line = new paragraph
        if (line.trim() === '') {
            if (html && !html.endsWith('>')) {
                html += '</p>';
            }
            continue;
        }

        // Regular paragraph
        if (!html.endsWith('>') || html.endsWith('</p>') || html.endsWith('</ul>') || html.endsWith('</ol>') || html.endsWith('</pre>')) {
            html += '<p>';
        }
        html += formatInlineStyles(line) + ' ';
    }

    // Close any open tags
    if (inList) {
        html += '</ul>';
    }
    if (html && !html.endsWith('>')) {
        html += '</p>';
    }

    return html;
};

// Format inline styles (bold, italic, code, links)
const formatInlineStyles = (text) => {
    // Escape HTML
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // Bold **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic *text* or _text_
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code `code`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');

    // Links [text](url)
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    return text;
};

// Create sources section HTML
const createSourcesSection = (sources) => {
    if (!sources || sources.length === 0) return '';

    const sourcesHtml = sources.map(source => `
        <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-item">
            <span class="source-title">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="15 3 21 3 21 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${source.title || 'Source'}
            </span>
            ${source.snippet ? `<span class="source-snippet">${source.snippet}</span>` : ''}
            <span class="source-url">${source.url}</span>
        </a>
    `).join('');

    return `
        <div class="sources-section">
            <div class="sources-header">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                    <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Sources (${sources.length})
            </div>
            <div class="sources-list">
                ${sourcesHtml}
            </div>
        </div>
    `;
};

// Create search status indicator
const createSearchStatus = (status, query = '') => {
    const isSearching = status === 'searching';
    const icon = isSearching
        ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="32">
                   <animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite"/>
               </circle>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
               <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>`;

    const text = isSearching
        ? `🔍 Searching the web${query ? `: <span class="search-query">"${query}"</span>` : '...'}`
        : '✓ Search complete';

    return `
        <div class="search-status ${isSearching ? 'searching' : 'complete'}">
            ${icon}
            <span>${text}</span>
        </div>
    `;
};

// Create message element with optional reasoning and sources
const createMessageElement = (content, type = 'user', reasoning = null, sources = null) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';

    if (type === 'user') {
        avatarDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    } else {
        avatarDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Add reasoning section if available
    if (reasoning && type === 'ai') {
        const reasoningDiv = document.createElement('details');
        reasoningDiv.className = 'reasoning-section';
        const reasoningSummary = document.createElement('summary');
        reasoningSummary.textContent = '🧠 Show Reasoning';
        reasoningDiv.appendChild(reasoningSummary);

        const reasoningContent = document.createElement('div');
        reasoningContent.className = 'reasoning-content';
        reasoningContent.innerHTML = formatText(reasoning);
        reasoningDiv.appendChild(reasoningContent);

        contentDiv.appendChild(reasoningDiv);
    }

    // Add main content
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';

    // Format AI responses, keep user messages as plain text
    if (type === 'ai') {
        mainContent.innerHTML = formatText(content);
    } else {
        mainContent.textContent = content;
    }

    contentDiv.appendChild(mainContent);

    // Add sources section if available
    if (sources && sources.length > 0 && type === 'ai') {
        const sourcesHtml = createSourcesSection(sources);
        const sourcesContainer = document.createElement('div');
        sourcesContainer.innerHTML = sourcesHtml;
        contentDiv.appendChild(sourcesContainer.firstElementChild);
    }

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
};

// Create typing indicator
const createTypingIndicator = () => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.id = 'typing-indicator';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    contentDiv.appendChild(typingDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
};

// API Configuration
const API_BASE_URL = 'https://flapwebsite.onrender.com';

// Conversation history
let conversationHistory = [];
let currentConversationId = null;

// Hide welcome screen
const hideWelcomeScreen = () => {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
};

// Call backend API with streaming
const getAIResponseStreaming = async (userMessage, messageElement) => {
    try {
        console.log('Starting streaming request...');

        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required. Please sign in again.');
        }

        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: userMessage,
                conversation_history: conversationHistory,
                conversation_id: currentConversationId
            })
        });

        if (!response.ok) {
            console.error('HTTP error:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Stream response received');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullResponse = '';
        let fullReasoning = '';
        let provider = null;
        let buffer = '';
        let hasContent = false;

        while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    try {
                        const parsed = JSON.parse(data);
                        console.log('SSE data:', parsed);

                        if (parsed.error) {
                            console.error('Stream error:', parsed.error);
                            throw new Error(parsed.error);
                        }

                        // Update reasoning
                        if (parsed.reasoning) {
                            fullReasoning += parsed.reasoning;
                        }

                        if (parsed.provider) {
                            provider = parsed.provider;
                            console.log('Provider received:', provider);

                            // Remove typing indicator
                            const contentDiv = messageElement.querySelector('.message-content');
                            const mainContent = contentDiv.querySelector('.main-content');

                            const typingIndicator = mainContent.querySelector('.typing-indicator');
                            if (typingIndicator) {
                                typingIndicator.remove();
                                console.log('Typing indicator removed');
                            }
                        }

                        // Capture conversation ID
                        if (parsed.conversation_id && !currentConversationId) {
                            currentConversationId = parsed.conversation_id;
                            console.log('Conversation ID received:', currentConversationId);
                            // Reload conversations list to show new conversation
                            loadConversations();
                        }

                        // Update content
                        if (parsed.content) {
                            hasContent = true;
                            fullResponse += parsed.content;
                            console.log('Content chunk received, total length:', fullResponse.length);

                            // Update the message element in real-time
                            const contentDiv = messageElement.querySelector('.main-content');
                            if (contentDiv) {
                                contentDiv.innerHTML = formatText(fullResponse);
                            }

                            // Auto-scroll
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }

                        // Done
                        if (parsed.done) {
                            console.log('Stream done, final content length:', fullResponse.length);
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, 'Raw data:', data);
                    }
                }
            }
        }

        // Update conversation history
        conversationHistory.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: fullResponse }
        );

        // Add reasoning section if available
        if (fullReasoning) {
            const contentDiv = messageElement.querySelector('.message-content');
            const reasoningDiv = document.createElement('details');
            reasoningDiv.className = 'reasoning-section';
            const reasoningSummary = document.createElement('summary');
            reasoningSummary.textContent = '🧠 Show Reasoning';
            reasoningDiv.appendChild(reasoningSummary);

            const reasoningContent = document.createElement('div');
            reasoningContent.className = 'reasoning-content';
            reasoningContent.innerHTML = formatText(fullReasoning);
            reasoningDiv.appendChild(reasoningContent);

            // Insert reasoning before main content
            const mainContent = contentDiv.querySelector('.main-content');
            contentDiv.insertBefore(reasoningDiv, mainContent);
        }

        return fullResponse;

    } catch (error) {
        console.error('Streaming error:', error);
        throw error;
    }
};

// Call backend API with web search streaming
const getAIResponseWithSearchStreaming = async (userMessage, messageElement) => {
    try {
        console.log('Starting web search streaming request...');

        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required. Please sign in again.');
        }

        const response = await fetch(`${API_BASE_URL}/api/chat/search/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: userMessage,
                conversation_history: conversationHistory,
                conversation_id: currentConversationId,
                provider: 'openai'  // or 'gemini'
            })
        });

        if (!response.ok) {
            console.error('HTTP error:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Web search stream response received');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullResponse = '';
        let provider = null;
        let buffer = '';
        let allSources = [];
        let searchStatusElement = null;

        while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    try {
                        const parsed = JSON.parse(data);
                        console.log('SSE data:', parsed);

                        if (parsed.error) {
                            console.error('Stream error:', parsed.error);
                            throw new Error(parsed.error);
                        }

                        // Handle provider and metadata
                        if (parsed.provider) {
                            provider = parsed.provider;
                            console.log('Provider received:', provider);

                            // Remove typing indicator
                            const contentDiv = messageElement.querySelector('.message-content');
                            const mainContent = contentDiv.querySelector('.main-content');

                            const typingIndicator = mainContent.querySelector('.typing-indicator');
                            if (typingIndicator) {
                                typingIndicator.remove();
                                console.log('Typing indicator removed');
                            }
                        }

                        // Capture conversation ID
                        if (parsed.conversation_id && !currentConversationId) {
                            currentConversationId = parsed.conversation_id;
                            console.log('Conversation ID received:', currentConversationId);
                            loadConversations();
                        }

                        // Handle search status
                        if (parsed.search_status === 'searching') {
                            const contentDiv = messageElement.querySelector('.message-content');
                            const mainContent = contentDiv.querySelector('.main-content');

                            // Add search status indicator
                            if (!searchStatusElement) {
                                searchStatusElement = document.createElement('div');
                                searchStatusElement.innerHTML = createSearchStatus('searching', parsed.search_query || '');
                                contentDiv.insertBefore(searchStatusElement.firstElementChild, mainContent);
                                searchStatusElement = contentDiv.querySelector('.search-status');
                            }
                        }

                        // Handle search complete
                        if (parsed.search_status === 'complete') {
                            if (searchStatusElement) {
                                searchStatusElement.outerHTML = createSearchStatus('complete');
                                searchStatusElement = messageElement.querySelector('.search-status');
                            }
                            // Collect sources
                            if (parsed.sources && parsed.sources.length > 0) {
                                allSources = parsed.sources;
                            }
                        }

                        // Update content
                        if (parsed.content) {
                            fullResponse += parsed.content;
                            console.log('Content chunk received, total length:', fullResponse.length);

                            // Update the message element in real-time
                            const contentDiv = messageElement.querySelector('.main-content');
                            if (contentDiv) {
                                contentDiv.innerHTML = formatText(fullResponse);
                            }

                            // Auto-scroll
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }

                        // Done
                        if (parsed.done) {
                            console.log('Stream done, final content length:', fullResponse.length);

                            // Add sources from final message
                            if (parsed.sources && parsed.sources.length > 0) {
                                allSources = parsed.sources;
                            }

                            // Add sources section if we have sources
                            if (allSources.length > 0) {
                                const contentDiv = messageElement.querySelector('.message-content');
                                const sourcesHtml = createSourcesSection(allSources);
                                const sourcesContainer = document.createElement('div');
                                sourcesContainer.innerHTML = sourcesHtml;
                                contentDiv.appendChild(sourcesContainer.firstElementChild);
                            }
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, 'Raw data:', data);
                    }
                }
            }
        }

        // Update conversation history
        conversationHistory.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: fullResponse }
        );

        return { response: fullResponse, sources: allSources };

    } catch (error) {
        console.error('Web search streaming error:', error);
        throw error;
    }
};

// Fallback: Call backend API (non-streaming)
const getAIResponse = async (userMessage) => {
    try {
        // Get auth token
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Authentication required. Please sign in again.');
        }

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: userMessage,
                conversation_history: conversationHistory,
                conversation_id: currentConversationId
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown error occurred');
        }

        // Update conversation history
        conversationHistory.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: data.response }
        );

        // Update conversation ID if returned
        if (data.conversation_id && !currentConversationId) {
            currentConversationId = data.conversation_id;
            loadConversations();
        }

        return {
            response: data.response,
            reasoning: data.reasoning,
            provider: data.provider
        };

    } catch (error) {
        console.error('Error calling API:', error);

        // Return fallback error message
        return {
            response: `I apologize, but I'm having trouble connecting to the server right now. Please make sure the backend server is running at ${API_BASE_URL}. Error: ${error.message}`,
            reasoning: null,
            provider: null
        };
    }
};

// Configuration: Enable web search by default
let useWebSearch = true;

// Handle sending message with streaming
const sendMessage = async () => {
    const message = messageInput.value.trim();

    if (!message) return;

    // Check if user is authenticated
    if (!isAuthenticated()) {
        // Show auth modal
        showAuthModal();
        return;
    }

    // Hide welcome screen on first message
    hideWelcomeScreen();

    // Add user message
    const userMessage = createMessageElement(message, 'user');
    chatMessages.appendChild(userMessage);

    // Clear input
    messageInput.value = '';
    autoResizeTextarea();

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Create AI message element for streaming
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai';

    const aiAvatarDiv = document.createElement('div');
    aiAvatarDiv.className = 'message-avatar';
    aiAvatarDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const aiContentDiv = document.createElement('div');
    aiContentDiv.className = 'message-content';

    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    mainContent.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

    aiContentDiv.appendChild(mainContent);
    aiMessageDiv.appendChild(aiAvatarDiv);
    aiMessageDiv.appendChild(aiContentDiv);
    chatMessages.appendChild(aiMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Disable send button
    sendButton.disabled = true;

    try {
        if (useWebSearch) {
            // Use web search endpoint with LangChain/LangGraph
            await getAIResponseWithSearchStreaming(message, aiMessageDiv);
        } else {
            // Use regular streaming endpoint
            await getAIResponseStreaming(message, aiMessageDiv);
        }
    } catch (error) {
        console.warn('Streaming failed, falling back to non-streaming:', error);

        // Fallback to non-streaming
        const result = await getAIResponse(message);

        // Remove typing indicator and update content
        mainContent.innerHTML = formatText(result.response);

        // Add reasoning if available
        if (result.reasoning) {
            const reasoningDiv = document.createElement('details');
            reasoningDiv.className = 'reasoning-section';
            const reasoningSummary = document.createElement('summary');
            reasoningSummary.textContent = '🧠 Show Reasoning';
            reasoningDiv.appendChild(reasoningSummary);

            const reasoningContent = document.createElement('div');
            reasoningContent.className = 'reasoning-content';
            reasoningContent.innerHTML = formatText(result.reasoning);
            reasoningDiv.appendChild(reasoningContent);

            aiContentDiv.insertBefore(reasoningDiv, mainContent);
        }
    }

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Enable send button
    sendButton.disabled = false;
    messageInput.focus();
};

// Event Listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Theme toggle moved to settings modal

newChatBtn.addEventListener('click', () => {
    // Start new conversation
    startNewConversation();
});

// Handle suggestion cards
const attachSuggestionListeners = () => {
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            messageInput.value = prompt;
            autoResizeTextarea();
            sendMessage();
        });
    });
};

// ==========================================
// Sidebar Functionality
// ==========================================
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarNewChat = document.getElementById('sidebarNewChat');
const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');

const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
};

const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
};

const toggleSidebar = () => {
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
};

const newConversationBtn = document.getElementById('newConversationBtn');

sidebarToggle?.addEventListener('click', toggleSidebar);
sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Sidebar footer new conversation button
newConversationBtn?.addEventListener('click', () => {
    startNewConversation();
    closeSidebar();
});

// Sidebar bar quick actions
sidebarNewChat?.addEventListener('click', () => {
    startNewConversation();
});

sidebarSettingsBtn?.addEventListener('click', () => {
    openSettingsModal();
});

// Mobile menu button
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
mobileMenuBtn?.addEventListener('click', openSidebar);

// Close sidebar with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSidebar();
        closeSettingsModal();
    }
});

// ==========================================
// Settings Modal Functionality
// ==========================================
const settingsModal = document.getElementById('settingsModal');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const settingsBtn = document.getElementById('settingsBtn');
const settingsClose = document.getElementById('settingsClose');
const darkModeToggle = document.getElementById('darkModeToggle');
const webSearchToggle = document.getElementById('webSearchToggle');

const openSettingsModal = () => {
    settingsModal.classList.add('active');
    closeSidebar(); // Close sidebar when opening settings

    // Sync dark mode toggle with current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    darkModeToggle.checked = currentTheme === 'dark';

    // Sync web search toggle
    webSearchToggle.checked = useWebSearch;
};

const closeSettingsModal = () => {
    settingsModal.classList.remove('active');
};

settingsBtn?.addEventListener('click', openSettingsModal);
settingsClose?.addEventListener('click', closeSettingsModal);
settingsModalOverlay?.addEventListener('click', closeSettingsModal);

// Dark mode toggle in settings
darkModeToggle?.addEventListener('change', () => {
    const newTheme = darkModeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Web search toggle in settings
webSearchToggle?.addEventListener('change', () => {
    useWebSearch = webSearchToggle.checked;
    localStorage.setItem('useWebSearch', useWebSearch);
});

// Load web search preference
const loadWebSearchPreference = () => {
    const savedPreference = localStorage.getItem('useWebSearch');
    if (savedPreference !== null) {
        useWebSearch = savedPreference === 'true';
    }
};

// ==========================================
// Mode Selector Dropdown
// ==========================================
const modeSelector = document.getElementById('modeSelector');
const modeSelectorToggle = document.getElementById('modeSelectorToggle');
const modeDropdown = document.getElementById('modeDropdown');
const modeLabel = document.getElementById('modeLabel');

let currentMode = 'auto';

const toggleModeDropdown = () => {
    modeSelector.classList.toggle('open');
};

const selectMode = (mode, label) => {
    currentMode = mode;
    modeLabel.textContent = label;

    // Update active state
    document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.mode === mode);
    });

    modeSelector.classList.remove('open');
};

modeSelectorToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModeDropdown();
});

modeDropdown?.addEventListener('click', (e) => {
    const option = e.target.closest('.mode-option');
    if (option) {
        const mode = option.dataset.mode;
        const label = option.querySelector('.mode-option-name').textContent;
        selectMode(mode, label);
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!modeSelector?.contains(e.target)) {
        modeSelector?.classList.remove('open');
    }
});

// ==========================================
// Initialize Everything
// ==========================================
initTheme();
loadWebSearchPreference();
attachSuggestionListeners();

// Focus input on load
messageInput.focus();
