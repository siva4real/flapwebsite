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

// Create message element
const createMessageElement = (content, type = 'user') => {
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
    contentDiv.textContent = content;
    
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
// Use empty string when using Docker Compose with Nginx (same origin)
// Use 'http://localhost:8000' when running backend separately
const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '3000' 
    ? 'http://localhost:8000'  // Development mode (separate servers)
    : '';  // Production/Docker mode (Nginx proxy)

// Conversation history
let conversationHistory = [];

// Hide welcome screen
const hideWelcomeScreen = () => {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
};

// Call backend API
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
        
        return data.response;
    } catch (error) {
        console.error('Error calling API:', error);
        
        // Return fallback error message
        return `I apologize, but I'm having trouble connecting to the server right now. Please make sure the backend server is running at ${API_BASE_URL}. Error: ${error.message}`;
    }
};

// Handle sending message
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
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Disable send button
    sendButton.disabled = true;
    
    // Get AI response from backend
    const aiResponse = await getAIResponse(message);
    
    // Remove typing indicator
    typingIndicator.remove();
    
    // Add AI response
    const aiMessage = createMessageElement(aiResponse, 'ai');
    chatMessages.appendChild(aiMessage);
    
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
