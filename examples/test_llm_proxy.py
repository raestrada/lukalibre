#!/usr/bin/env python3
"""
Test script for LLM Proxy API endpoints - Basic connectivity test
Tests the basic API connectivity without authentication for now
"""

import requests
import json
import time
import os
from pathlib import Path

# API Configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

def wait_for_api(max_retries=30, delay=2):
    """Wait for API to be available"""
    print("Waiting for API to be available...")
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                print("✅ API is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        
        if i < max_retries - 1:
            print(f"⏳ Waiting... ({i+1}/{max_retries})")
            time.sleep(delay)
    
    print("❌ API not available after waiting")
    return False

def test_health_check():
    """Test basic health check"""
    print("\n🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_openapi_spec():
    """Test OpenAPI specification endpoint"""
    print("\n🔍 Testing OpenAPI specification...")
    try:
        response = requests.get(f"{API_V1}/openapi.json")
        if response.status_code == 200:
            spec = response.json()
            if "openapi" in spec:
                print("✅ OpenAPI specification available")
                print(f"API Title: {spec.get('info', {}).get('title', 'Unknown')}")
                print(f"API Version: {spec.get('info', {}).get('version', 'Unknown')}")
                return True
            else:
                print("❌ Invalid OpenAPI specification")
                return False
        else:
            print(f"❌ OpenAPI specification failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OpenAPI specification error: {e}")
        return False

def test_basic_endpoints():
    """Test basic API endpoints without authentication"""
    print("\n🔍 Testing basic endpoints...")
    
    # Test endpoints that might not require authentication
    endpoints_to_test = [
        ("/", "Root endpoint"),
        ("/health", "Health check"),
        ("/api/v1/", "API v1 root"),
    ]
    
    passed = 0
    for endpoint, description in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code in [200, 404, 401]:  # 401 is expected for protected endpoints
                print(f"✅ {description}: {response.status_code}")
                if response.status_code == 200:
                    passed += 1
            else:
                print(f"❌ {description}: {response.status_code}")
        except Exception as e:
            print(f"❌ {description}: {e}")
    
    return passed > 0

def test_llm_proxy_endpoint_structure():
    """Test LLM proxy endpoint structure (without auth)"""
    print("\n🔍 Testing LLM proxy endpoint structure...")
    
    headers = {"Content-Type": "application/json"}
    
    # Test with minimal payload to see the response structure
    payload = {
        "content": "test",
        "step": "identify_schema"
    }
    
    try:
        response = requests.post(
            f"{API_V1}/llm/proxy",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 401:
            print("✅ LLM proxy endpoint requires authentication (as expected)")
            return True
        elif response.status_code == 422:
            print("✅ LLM proxy endpoint validates input (validation error)")
            print(f"Validation error: {response.text}")
            return True
        elif response.status_code == 200:
            result = response.json()
            print(f"✅ LLM proxy endpoint accessible")
            print(f"Response structure: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
            return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ LLM proxy endpoint error: {e}")
        return False

def main():
    """Run all basic API tests"""
    print("🚀 Starting Basic API Connectivity Tests")
    print("=" * 50)
    
    # Wait for API to be ready
    if not wait_for_api():
        print("❌ API not available, tests cannot run")
        return False
    
    # Run tests
    tests = [
        test_health_check,
        test_openapi_spec,
        test_basic_endpoints,
        test_llm_proxy_endpoint_structure
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All basic connectivity tests passed!")
        print("💡 API is running and responsive")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)