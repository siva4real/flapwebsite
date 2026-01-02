"""
Quick test script to verify Firebase authentication setup
Run this after setting up your .env file with Firebase credentials
"""

import os
from dotenv import load_dotenv
from auth import initialize_firebase

# Load environment variables
load_dotenv()

print("Testing Firebase Authentication Setup...")
print("-" * 50)

# Check if Firebase service account is set
firebase_creds = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if firebase_creds:
    print("✓ FIREBASE_SERVICE_ACCOUNT environment variable found")
    print(f"  Length: {len(firebase_creds)} characters")
else:
    print("✗ FIREBASE_SERVICE_ACCOUNT environment variable NOT found")
    print("  Please add it to your .env file")
    exit(1)

# Try to initialize Firebase
print("\nInitializing Firebase...")
result = initialize_firebase()

if result:
    print("✓ Firebase initialized successfully!")
    print("\n" + "=" * 50)
    print("Firebase Authentication is ready to use!")
    print("=" * 50)
else:
    print("✗ Firebase initialization failed")
    print("  Check your service account JSON format")
    exit(1)
