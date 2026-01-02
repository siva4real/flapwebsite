"""
Firebase Authentication Module
Handles token verification and user authentication
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os
import json

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
    except ValueError:
        # Get credentials from environment variable
        firebase_creds = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        
        if not firebase_creds:
            print("WARNING: FIREBASE_SERVICE_ACCOUNT not set. Authentication will not work.")
            return False
        
        try:
            # Parse the JSON credentials
            cred_dict = json.loads(firebase_creds)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully")
            return True
        except Exception as e:
            print(f"ERROR: Failed to initialize Firebase: {e}")
            return False

# Get Firestore client
def get_firestore_client():
    """Get Firestore client instance"""
    try:
        return firestore.client()
    except Exception as e:
        print(f"ERROR: Failed to get Firestore client: {e}")
        return None

# Security scheme
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify Firebase ID token and return user info
    
    Args:
        credentials: HTTP Bearer token from request header
        
    Returns:
        dict: User information from token (uid, email, etc.)
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "email_verified": decoded_token.get("email_verified", False)
        }
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired"
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

async def get_current_user(user_info: dict = Depends(verify_token)) -> dict:
    """
    Dependency to get current authenticated user
    
    Args:
        user_info: User information from verify_token
        
    Returns:
        dict: User information
    """
    return user_info

# Optional authentication - returns None if no token provided
from fastapi import Request

async def get_optional_user(request: Request) -> Optional[dict]:
    """
    Optional authentication - allows requests with or without tokens
    
    Args:
        request: FastAPI request object
        
    Returns:
        dict or None: User information if token provided and valid, None otherwise
    """
    # Try to get the Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    try:
        # Extract token
        token = auth_header.replace("Bearer ", "")
        
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "email_verified": decoded_token.get("email_verified", False)
        }
    except Exception:
        return None
