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
const themeToggle = document.getElementById('themeToggle');
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

// Create message element with optional reasoning and provider
const createMessageElement = (content, type = 'user', reasoning = null, provider = null) => {
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
    
    // Add provider badge if available
    if (provider && type === 'ai') {
        const providerBadge = document.createElement('div');
        providerBadge.className = 'provider-badge';
        const providerNames = {
            'grok': '🤖 Grok',
            'openai': '🧠 GPT',
            'gemini': '✨ Gemini'
        };
        providerBadge.textContent = providerNames[provider] || provider;
        contentDiv.appendChild(providerBadge);
    }
    
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

// Hide welcome screen
const hideWelcomeScreen = () => {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
};

// Call backend API with streaming
const getAIResponseStreaming = async (userMessage, messageElement) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                conversation_history: conversationHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let fullResponse = '';
        let fullReasoning = '';
        let provider = null;
        let buffer = '';
        
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
                        
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        
                        // Update reasoning
                        if (parsed.reasoning) {
                            fullReasoning += parsed.reasoning;
                        }
                        
                        // Capture provider info
                        if (parsed.provider) {
                            provider = parsed.provider;
                            // Add provider badge and remove typing indicator
                            const contentDiv = messageElement.querySelector('.message-content');
                            const mainContent = contentDiv.querySelector('.main-content');
                            
                            // Remove typing indicator
                            const typingIndicator = mainContent.querySelector('.typing-indicator');
                            if (typingIndicator) {
                                typingIndicator.remove();
                            }
                            
                            // Add provider badge
                            const providerBadge = document.createElement('div');
                            providerBadge.className = 'provider-badge';
                            const providerNames = {
                                'grok': '🤖 Grok',
                                'openai': '🧠 GPT',
                                'gemini': '✨ Gemini'
                            };
                            providerBadge.textContent = providerNames[provider] || provider;
                            contentDiv.insertBefore(providerBadge, contentDiv.firstChild);
                        }
                        
                        // Update content
                        if (parsed.content) {
                            fullResponse += parsed.content;
                            
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
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
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

// Fallback: Call backend API (non-streaming)
const getAIResponse = async (userMessage) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                conversation_history: conversationHistory
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

// Handle sending message with streaming
const sendMessage = async () => {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
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
        // Try streaming first
        await getAIResponseStreaming(message, aiMessageDiv);
    } catch (error) {
        console.warn('Streaming failed, falling back to non-streaming:', error);
        
        // Fallback to non-streaming
        const result = await getAIResponse(message);
        
        // Remove typing indicator and update content
        mainContent.innerHTML = formatText(result.response);
        
        // Add provider badge if available
        if (result.provider) {
            const providerBadge = document.createElement('div');
            providerBadge.className = 'provider-badge';
            const providerNames = {
                'grok': '🤖 Grok',
                'openai': '🧠 GPT',
                'gemini': '✨ Gemini'
            };
            providerBadge.textContent = providerNames[result.provider] || result.provider;
            aiContentDiv.insertBefore(providerBadge, aiContentDiv.firstChild);
        }
        
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

themeToggle.addEventListener('click', toggleTheme);

newChatBtn.addEventListener('click', () => {
    // Clear conversation history
    conversationHistory = [];
    
    // Clear chat messages
    chatMessages.innerHTML = `
        <div class="welcome-screen" id="welcomeScreen">
            <div class="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="welcome-title">Welcome to Flap AI</h1>
            <p class="welcome-subtitle">Your expert medical assistant. Ask me anything about health and medicine.</p>
            
            <div class="suggestion-cards">
                <button class="suggestion-card" data-prompt="What are the common symptoms of diabetes?">
                    <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>What are the common symptoms of diabetes?</span>
                </button>
                <button class="suggestion-card" data-prompt="How can I improve my cardiovascular health?">
                    <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>How can I improve my cardiovascular health?</span>
                </button>
                <button class="suggestion-card" data-prompt="Explain the difference between bacteria and viruses">
                    <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>Explain the difference between bacteria and viruses</span>
                </button>
                <button class="suggestion-card" data-prompt="What should I know about nutrition and balanced diet?">
                    <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>What should I know about nutrition and balanced diet?</span>
                </button>
            </div>
        </div>
    `;
    
    // Re-attach suggestion card listeners
    attachSuggestionListeners();
    
    messageInput.value = '';
    autoResizeTextarea();
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

// Initialize
initTheme();
attachSuggestionListeners();

// Focus input on load
messageInput.focus();
