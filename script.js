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

// Hide welcome screen
const hideWelcomeScreen = () => {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
};

// Simulate AI response
const simulateAIResponse = (userMessage) => {
    const responses = {
        "diabetes": "Diabetes is a chronic condition that affects how your body processes blood sugar (glucose). Common symptoms include increased thirst, frequent urination, extreme fatigue, blurred vision, and slow-healing wounds. There are two main types: Type 1 (autoimmune) and Type 2 (insulin resistance). Management typically involves blood sugar monitoring, medication, diet modifications, and regular exercise. It's important to work with a healthcare provider for proper diagnosis and treatment.",
        
        "cardiovascular": "Improving cardiovascular health involves several key lifestyle factors: 1) Regular aerobic exercise (150 minutes per week), 2) A heart-healthy diet rich in fruits, vegetables, whole grains, and lean proteins, 3) Maintaining a healthy weight, 4) Not smoking, 5) Managing stress, 6) Getting adequate sleep (7-9 hours), and 7) Regular health screenings. These habits help lower blood pressure, improve cholesterol levels, and reduce heart disease risk.",
        
        "bacteria": "Bacteria and viruses are both microscopic organisms, but they differ significantly: Bacteria are single-celled organisms that can survive independently and reproduce on their own. Many bacteria are beneficial. Viruses are much smaller and require a host cell to reproduce. They hijack cells to replicate. Antibiotics work against bacteria but are ineffective against viruses. Viral infections often require supportive care or specific antiviral medications.",
        
        "nutrition": "A balanced diet includes: 1) Proteins (lean meats, fish, legumes, nuts) for tissue repair, 2) Carbohydrates (whole grains, fruits, vegetables) for energy, 3) Healthy fats (olive oil, avocados, fish) for hormone production, 4) Vitamins and minerals from varied colorful fruits and vegetables, 5) Adequate hydration. Aim for portion control, minimize processed foods, and eat regular meals. Individual needs vary based on age, activity level, and health conditions.",
        
        "default": "I'm Flap AI, your medical assistant. I can help you understand various health topics, symptoms, and general medical information. However, please remember that I'm not a substitute for professional medical advice. For specific health concerns, always consult with a qualified healthcare provider. How can I assist you with your medical questions today?"
    };
    
    // Simple keyword matching for demo purposes
    const lowerMessage = userMessage.toLowerCase();
    let response = responses.default;
    
    if (lowerMessage.includes('diabetes') || lowerMessage.includes('symptom')) {
        response = responses.diabetes;
    } else if (lowerMessage.includes('cardiovascular') || lowerMessage.includes('heart') || lowerMessage.includes('health')) {
        response = responses.cardiovascular;
    } else if (lowerMessage.includes('bacteria') || lowerMessage.includes('virus')) {
        response = responses.bacteria;
    } else if (lowerMessage.includes('nutrition') || lowerMessage.includes('diet') || lowerMessage.includes('food')) {
        response = responses.nutrition;
    }
    
    return response;
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
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Remove typing indicator
    typingIndicator.remove();
    
    // Add AI response
    const aiResponse = simulateAIResponse(message);
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
