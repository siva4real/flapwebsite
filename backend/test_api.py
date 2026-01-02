"""
Test script for Flap AI Backend API
Run this after starting the backend to verify it's working correctly
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def print_header(text):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_health_check():
    """Test the health check endpoint"""
    print_header("Testing Health Check Endpoint")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("grok_api_configured"):
                print("✓ Grok API is configured")
                return True
            else:
                print("✗ Grok API is NOT configured")
                print("  Please add GROK_API_KEY to your .env file")
                return False
        else:
            print(f"✗ Health check failed with status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend")
        print(f"  Make sure the backend is running at {BASE_URL}")
        return False
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

def test_chat_endpoint():
    """Test the chat endpoint"""
    print_header("Testing Chat Endpoint")
    
    test_message = "Hello, what is diabetes?"
    print(f"Sending message: '{test_message}'")
    
    try:
        payload = {
            "message": test_message,
            "conversation_history": []
        }
        
        print("Waiting for response (this may take 10-20 seconds)...")
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=payload,
            timeout=TIMEOUT
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                print("✓ Chat request successful")
                print(f"\nAI Response:\n{data.get('response', 'No response')}\n")
                return True
            else:
                print("✗ Chat request failed")
                print(f"Error: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"✗ Request failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out")
        print("  The Grok API might be slow or unavailable")
        return False
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

def test_api_docs():
    """Test if API documentation is accessible"""
    print_header("Testing API Documentation")
    
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        
        if response.status_code == 200:
            print("✓ API documentation is accessible")
            print(f"  Visit: {BASE_URL}/docs")
            return True
        else:
            print(f"✗ Cannot access API docs (status: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  FLAP AI BACKEND TEST SUITE")
    print("="*60)
    print(f"\nTesting backend at: {BASE_URL}\n")
    
    results = {
        "Health Check": test_health_check(),
        "API Documentation": test_api_docs(),
        "Chat Endpoint": False
    }
    
    # Only test chat if health check passed
    if results["Health Check"]:
        results["Chat Endpoint"] = test_chat_endpoint()
    else:
        print("\n⚠ Skipping chat test because health check failed")
    
    # Summary
    print_header("TEST SUMMARY")
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name:<25} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("  ✓ ALL TESTS PASSED")
        print("  Your backend is ready to use!")
    else:
        print("  ✗ SOME TESTS FAILED")
        print("  Please check the errors above")
    print("="*60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
