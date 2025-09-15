#!/usr/bin/env python3
"""
Test script for LLM Proxy API endpoints with full authentication
Tests Google OAuth flow and LLM specialized models
"""

import requests
import json
import time
import os
import webbrowser
from urllib.parse import urlparse, parse_qs
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

def authenticate_with_google():
    """
    Interactive Google OAuth authentication flow
    Returns access token if successful
    """
    print("\n🔑 Starting Google OAuth authentication...")
    
    # Get authorization URL
    try:
        auth_response = requests.get(f"{API_V1}/auth/google/authorize")
        if auth_response.status_code == 302:
            auth_url = auth_response.headers.get('Location')
            print(f"🌐 Opening Google authorization URL...")
            print(f"URL: {auth_url}")
            
            # Try to open browser automatically
            try:
                webbrowser.open(auth_url)
                print("✅ Browser opened automatically")
            except:
                print("❌ Could not open browser automatically")
                print(f"Please manually open: {auth_url}")
            
            # Instructions for manual flow
            print("\n📋 Manual OAuth Flow Instructions:")
            print("1. Complete Google OAuth in the browser")
            print("2. After authorization, you'll be redirected to a callback URL")
            print("3. Copy the FULL callback URL (including 'code=' parameter)")
            print("4. Paste it below")
            
            callback_url = input("\n🔗 Paste the callback URL here: ").strip()
            
            # Extract code from callback URL
            parsed_url = urlparse(callback_url)
            query_params = parse_qs(parsed_url.query)
            
            if 'code' not in query_params:
                print("❌ No authorization code found in URL")
                return None
            
            auth_code = query_params['code'][0]
            print(f"✅ Authorization code extracted: {auth_code[:20]}...")
            
            # Exchange code for token
            token_response = requests.post(
                f"{API_V1}/auth/google-callback",
                json={"code": auth_code}
            )
            
            if token_response.status_code == 200:
                token_data = token_response.json()
                access_token = token_data.get('access_token')
                print("✅ Authentication successful!")
                print(f"Token type: {token_data.get('token_type', 'unknown')}")
                return access_token
            else:
                print(f"❌ Token exchange failed: {token_response.status_code}")
                print(f"Response: {token_response.text}")
                return None
                
        else:
            print(f"❌ Failed to get authorization URL: {auth_response.status_code}")
            print(f"Response: {auth_response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_llm_proxy_text_only(access_token):
    """Test LLM proxy with text-only content (should use TEXT_MODEL: qwen3-coder:free)"""
    print("\n🔍 Testing LLM proxy - Text only (qwen3-coder:free)...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    # Test JSON request for text-only schema identification
    payload = {
        "content": "Tengo un sueldo mensual de $850,000 chilenos y trabajo como ingeniero de software",
        "step": "identify_schema",
        "schemas": ["sueldo", "gasto_alimentacion", "credito", "inversion"]
    }
    
    try:
        print("📤 Sending request...")
        response = requests.post(
            f"{API_V1}/llm/proxy",
            headers=headers,
            json=payload,
            timeout=60  # Increased timeout for LLM response
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            llm_output = result.get('llm_output', 'No output')
            print(f"✅ Text-only request successful")
            print(f"🧠 Model response: {llm_output}")
            print(f"📊 Expected model: qwen3-coder:free (text-only)")
            return True
        else:
            print(f"❌ Text-only request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Text-only request error: {e}")
        return False

def test_llm_proxy_sql_generation(access_token):
    """Test LLM proxy SQL/JSON generation (text-only)"""
    print("\n🔍 Testing LLM proxy - SQL/JSON generation...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    payload = {
        "content": "Sueldo mensual: $850,000. Trabajo como ingeniero en una empresa de tecnología. Fecha de pago: día 30 de cada mes. RUT empresa: 76.123.456-7",
        "step": "generate_sql_json",
        "schema_name": "sueldo"
    }
    
    try:
        print("📤 Sending request...")
        response = requests.post(
            f"{API_V1}/llm/proxy",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            llm_output = result.get('llm_output', 'No output')
            print(f"✅ SQL/JSON generation successful")
            print(f"🧠 Model response (first 200 chars): {llm_output[:200]}...")
            
            # Try to parse as JSON to verify structure
            try:
                if llm_output.strip().startswith('{'):
                    parsed = json.loads(llm_output)
                    print(f"📋 JSON structure: {list(parsed.keys())}")
                else:
                    print(f"📋 Response type: Plain text")
            except:
                print(f"📋 Response type: Not valid JSON")
            
            return True
        else:
            print(f"❌ SQL/JSON generation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ SQL/JSON generation error: {e}")
        return False

def test_llm_proxy_with_mock_image(access_token):
    """Test LLM proxy with mock image file (should use IMAGE_MODEL: gemini-2.5-flash)"""
    print("\n🔍 Testing LLM proxy - With mock image (gemini-2.5-flash)...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Create a small mock image file for testing (1x1 PNG)
    mock_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0bIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
    
    data = {
        "prompt": "Analiza esta imagen y describe qué tipo de documento financiero es. Si es una factura, extrae los montos."
    }
    
    files = {
        "files": ("documento_financiero.png", mock_image_content, "image/png")
    }
    
    try:
        print("📤 Sending request with image...")
        response = requests.post(
            f"{API_V1}/llm/proxy",
            headers=headers,
            data=data,
            files=files,
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            llm_output = result.get('llm_output', 'No output')
            print(f"✅ Image request successful")
            print(f"🧠 Model response: {llm_output}")
            print(f"📊 Expected model: gemini-2.5-flash (vision-capable)")
            return True
        else:
            print(f"❌ Image request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Image request error: {e}")
        return False

def test_llm_proxy_form_text_only(access_token):
    """Test LLM proxy with form data (text without images)"""
    print("\n🔍 Testing LLM proxy - Form data text only...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    data = {
        "prompt": "Genera consejos de ahorro para una persona que gana $850,000 mensuales en Chile. Incluye estrategias específicas para el contexto chileno."
    }
    
    try:
        print("📤 Sending form request...")
        response = requests.post(
            f"{API_V1}/llm/proxy",
            headers=headers,
            data=data,
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            llm_output = result.get('llm_output', 'No output')
            print(f"✅ Form data (text) request successful")
            print(f"🧠 Model response (first 150 chars): {llm_output[:150]}...")
            print(f"📊 Expected model: qwen3-coder:free (text-only)")
            return True
        else:
            print(f"❌ Form data (text) request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Form data (text) request error: {e}")
        return False

def main():
    """Run all authenticated API tests"""
    print("🚀 Starting Authenticated LLM Proxy API Tests")
    print("=" * 60)
    
    # Wait for API to be ready
    if not wait_for_api():
        print("❌ API not available, tests cannot run")
        return False
    
    # Authenticate with Google
    access_token = authenticate_with_google()
    if not access_token:
        print("❌ Authentication failed, cannot test protected endpoints")
        return False
    
    print(f"\n🎫 Access token obtained: {access_token[:20]}...")
    
    # Run authenticated tests
    tests = [
        lambda: test_llm_proxy_text_only(access_token),
        lambda: test_llm_proxy_sql_generation(access_token),
        lambda: test_llm_proxy_form_text_only(access_token),
        lambda: test_llm_proxy_with_mock_image(access_token),
    ]
    
    passed = 0
    total = len(tests)
    
    for i, test in enumerate(tests, 1):
        print(f"\n{'='*20} Test {i}/{total} {'='*20}")
        try:
            if test():
                passed += 1
                print(f"✅ Test {i} PASSED")
            else:
                print(f"❌ Test {i} FAILED")
        except Exception as e:
            print(f"❌ Test {i} failed with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All authenticated tests passed!")
        print("💡 LLM specialized models working correctly:")
        print("   📝 Text tasks → qwen3-coder:free")
        print("   🖼️  Image tasks → gemini-2.5-flash")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)