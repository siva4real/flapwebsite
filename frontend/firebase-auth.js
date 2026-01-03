// Firebase Authentication Module
// Import Firebase SDK from CDN (loaded in HTML)

let auth;
let currentUser = null;

// Initialize Firebase
function initializeFirebase(config) {
    try {
        const app = firebase.initializeApp(config);
        auth = firebase.auth();
        
        console.log('Firebase initialized successfully');
        
        // Check if user is completing magic link sign in
        completeMagicLinkSignIn();
        
        // Set up auth state listener
        auth.onAuthStateChanged(handleAuthStateChange);
        
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Handle auth state changes
function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        console.log('User signed in:', user.email);
        updateUIForSignedIn();
        
        // Store user token for API calls
        user.getIdToken().then(token => {
            localStorage.setItem('authToken', token);
        });
    } else {
        currentUser = null;
        console.log('User signed out');
        updateUIForSignedOut();
        localStorage.removeItem('authToken');
    }
}

// Update UI when user is signed in
function updateUIForSignedIn() {
    // Hide sign in button
    const signInBtn = document.getElementById('headerSignInBtn');
    if (signInBtn) signInBtn.style.display = 'none';
    
    // Show user profile
    const userProfile = document.getElementById('userProfile');
    if (userProfile) userProfile.style.display = 'flex';
    
    // Update email
    const userEmail = document.getElementById('userEmail');
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
    }
    
    // Show sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'flex';
    
    // Close auth modal if open
    closeAuthModal();
    
    // Initialize chat history
    if (typeof initializeChatHistory === 'function') {
        initializeChatHistory();
    }
}

// Update UI when user is signed out
function updateUIForSignedOut() {
    // Show sign in button
    const signInBtn = document.getElementById('headerSignInBtn');
    if (signInBtn) signInBtn.style.display = 'block';
    
    // Hide user profile
    const userProfile = document.getElementById('userProfile');
    if (userProfile) userProfile.style.display = 'none';
    
    // Hide sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';
}

// Show auth modal
function showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'block';
        authModal.classList.add('active');
    }
}

// Close auth modal
function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'none';
        authModal.classList.remove('active');
    }
}

// Get current auth token
async function getAuthToken() {
    if (!currentUser) {
        return null;
    }
    
    try {
        // This will refresh the token if needed
        const token = await currentUser.getIdToken();
        localStorage.setItem('authToken', token);
        return token;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

// Send magic link (passwordless email sign in)
async function sendMagicLink(email) {
    try {
        const actionCodeSettings = {
            // URL to redirect to after email link sign in
            url: window.location.href,
            handleCodeInApp: true
        };
        
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);
        
        // Save the email locally so we can complete sign in after redirect
        window.localStorage.setItem('emailForSignIn', email);
        
        console.log('Magic link sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Magic link error:', error);
        return { success: false, error: error.message };
    }
}

// Complete email link sign in after user clicks link
async function completeMagicLinkSignIn() {
    try {
        // Check if the user clicked on an email link
        if (auth.isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            
            // If email is not available, ask user to provide it
            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
            }
            
            const result = await auth.signInWithEmailLink(email, window.location.href);
            
            // Clear email from storage
            window.localStorage.removeItem('emailForSignIn');
            
            console.log('Magic link sign in successful');
            return { success: true, user: result.user };
        }
        
        return { success: false, error: 'Not a sign-in link' };
    } catch (error) {
        console.error('Magic link completion error:', error);
        return { success: false, error: error.message };
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        console.log('Google sign in successful');
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Google sign in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        console.log('Sign out successful');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Get user's display name or email
function getUserDisplayName() {
    if (!currentUser) return '';
    return currentUser.displayName || currentUser.email || 'User';
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}
