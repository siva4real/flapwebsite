// Authentication UI Handler
// Handles all UI interactions for authentication

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase with config from HTML
    if (typeof firebaseConfig !== 'undefined') {
        initializeFirebase(firebaseConfig);
    } else {
        console.error('Firebase config not found. Please add your Firebase configuration.');
    }

    setupAuthUI();
});

function setupAuthUI() {
    // Header sign in button
    document.getElementById('headerSignInBtn')?.addEventListener('click', () => {
        showAuthModal();
    });
    
    // Modal close button
    document.getElementById('authModalClose')?.addEventListener('click', () => {
        closeAuthModal();
    });
    
    // Modal overlay click
    document.getElementById('authModalOverlay')?.addEventListener('click', () => {
        closeAuthModal();
    });
    
    // Tab switching
    const emailTab = document.getElementById('emailTab');
    const googleTab = document.getElementById('googleTab');
    const emailForm = document.getElementById('emailForm');
    const googleForm = document.getElementById('googleForm');

    emailTab?.addEventListener('click', () => {
        emailTab.classList.add('active');
        googleTab.classList.remove('active');
        emailForm.classList.add('active');
        googleForm.classList.remove('active');
        clearMessages();
    });

    googleTab?.addEventListener('click', () => {
        googleTab.classList.add('active');
        emailTab.classList.remove('active');
        googleForm.classList.add('active');
        emailForm.classList.remove('active');
        clearMessages();
    });

    // Email Magic Link Form
    emailForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const button = document.getElementById('emailButton');
        const errorDiv = document.getElementById('emailError');
        const successDiv = document.getElementById('emailSuccess');

        // Disable button and show loading
        button.disabled = true;
        button.innerHTML = '<span class="auth-loading"></span> Sending...';
        errorDiv.classList.remove('active');
        successDiv.classList.remove('active');

        const result = await sendMagicLink(email);

        if (result.success) {
            successDiv.textContent = 'Check your email for a sign-in link';
            successDiv.classList.add('active');
            document.getElementById('emailInput').value = '';
            button.textContent = 'Continue';
            button.disabled = false;
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('active');
            button.disabled = false;
            button.textContent = 'Continue';
        }
    });

    // Google Sign In
    document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
        const button = document.getElementById('googleSignInBtn');
        const errorDiv = document.getElementById('googleError');
        
        button.disabled = true;
        button.innerHTML = '<span class="auth-loading"></span> Signing in with Google...';
        errorDiv.classList.remove('active');

        const result = await signInWithGoogle();

        if (!result.success) {
            errorDiv.textContent = result.error;
            errorDiv.classList.add('active');
            button.disabled = false;
            button.innerHTML = `
                <svg class="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            `;
        }
    });

    // Logout Button
    document.getElementById('logoutButton')?.addEventListener('click', async () => {
        const result = await signOut();
        if (!result.success) {
            console.error('Logout error:', result.error);
        }
    });
}

function clearMessages() {
    document.getElementById('emailError')?.classList.remove('active');
    document.getElementById('emailSuccess')?.classList.remove('active');
    document.getElementById('googleError')?.classList.remove('active');
}
