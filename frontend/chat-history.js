// Chat History Management
// Handles loading, saving, and displaying conversation history
// Note: Depends on API_BASE_URL and currentConversationId from script.js

// Load all conversations for the user
async function loadConversations() {
    try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load conversations');

        const data = await response.json();
        displayConversations(data.conversations);
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Display conversations in sidebar
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
        conversationsList.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">No conversations yet</p>';
        return;
    }

    conversations.forEach(conv => {
        const item = document.createElement('button');
        item.className = 'conversation-item';
        if (conv.id === currentConversationId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="conversation-title">${conv.title}</div>
            <div class="conversation-preview">${conv.last_message}</div>
            <button class="conversation-delete" data-id="${conv.id}" onclick="deleteConversation(event, '${conv.id}')">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.conversation-delete')) {
                loadConversation(conv.id);
            }
        });

        conversationsList.appendChild(item);
    });
}

// Load a specific conversation
async function loadConversation(conversationId) {
    try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load conversation');

        const data = await response.json();

        currentConversationId = conversationId;
        conversationHistory = data.messages || [];

        // Clear chat and display messages
        clearChat();
        document.querySelector('.header')?.classList.add('chatting');
        data.messages.forEach(msg => {
            const messageElement = createMessageElement(msg.content, msg.role === 'user' ? 'user' : 'ai');
            chatMessages.appendChild(messageElement);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Update active state in sidebar
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-id="${conversationId}"]`)?.closest('.conversation-item')?.classList.add('active');

    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

// Delete a conversation
async function deleteConversation(event, conversationId) {
    event.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete conversation');

        // If we deleted the current conversation, start a new one
        if (conversationId === currentConversationId) {
            startNewConversation();
        }

        // Reload conversations list
        loadConversations();
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}

// Start a new conversation
function startNewConversation() {
    currentConversationId = null;
    conversationHistory = [];
    clearChat();
    showWelcomeScreen();

    // Remove active state from all conversations
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Clear chat messages
function clearChat() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Remove all messages except welcome screen
    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
}

// Show welcome screen and hide header logo
function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }
    document.querySelector('.header')?.classList.remove('chatting');
}

// Toggle sidebar function is now defined in script.js

// Initialize chat history
function initializeChatHistory() {
    // Load conversations when user signs in
    loadConversations();

    // Note: Event listeners for sidebar toggle and new conversation
    // are now handled in script.js
}
