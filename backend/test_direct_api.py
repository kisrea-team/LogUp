#!/usr/bin/env python3
import os
import sys
import json
import hashlib
import hmac
import base64
import datetime
import requests
from urllib.parse import urlencode
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_direct_api():
    """Test Tencent Translate API directly with HTTP requests"""
    try:
        # Get credentials from environment variables
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        if not secret_id or not secret_key:
            print("Error: Tencent translation credentials not found")
            return
            
        # API endpoint
        endpoint = "tmt.tencentcloudapi.com"
        service = "tmt"
        version = "2018-03-21"
        action = "TextTranslate"
        
        # Request parameters
        params = {
            "SourceText": "Learn what is new in the Visual Studio Code July 2025 Release (1.103)",
            "Source": "en",
            "Target": "zh",
            "ProjectId": 0
        }
        
        # Timestamp
        timestamp = int(datetime.datetime.timestamp(datetime.datetime.now()))
        datestamp = datetime.datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d')
        
        # Canonical request
        http_request_method = "POST"
        canonical_uri = "/"
        canonical_querystring = ""
        canonical_headers = f"content-type:application/json; charset=utf-8\nhost:{endpoint}\nx-tc-action:{action.lower()}\n"
        signed_headers = "content-type;host;x-tc-action"
        
        payload = json.dumps(params)
        payload_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        canonical_request = f"{http_request_method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
        
        # String to sign
        algorithm = "TC3-HMAC-SHA256"
        credential_scope = f"{datestamp}/{service}/tc3_request"
        string_to_sign = f"{algorithm}\n{timestamp}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
        
        # Sign
        secret_date = hmac.new(('TC3' + secret_key).encode('utf-8'), datestamp.encode('utf-8'), hashlib.sha256).digest()
        secret_service = hmac.new(secret_date, service.encode('utf-8'), hashlib.sha256).digest()
        secret_signing = hmac.new(secret_service, 'tc3_request'.encode('utf-8'), hashlib.sha256).digest()
        signature = hmac.new(secret_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
        
        # Authorization header
        authorization = f"{algorithm} Credential={secret_id}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
        
        # Headers
        headers = {
            'Authorization': authorization,
            'Content-Type': 'application/json; charset=utf-8',
            'Host': endpoint,
            'X-TC-Action': action,
            'X-TC-Timestamp': str(timestamp),
            'X-TC-Version': version,
            'X-TC-Region': region
        }
        
        # Make request
        url = f"https://{endpoint}"
        response = requests.post(url, headers=headers, data=payload)
        
        print("Status code:", response.status_code)
        print("Response headers:", response.headers)
        print("Response content:", response.text)
        
        # Try to parse JSON
        try:
            response_data = response.json()
            print("Parsed JSON:", json.dumps(response_data, indent=2, ensure_ascii=False))
            
            # Extract translated text
            if 'Response' in response_data and 'TargetText' in response_data['Response']:
                translated_text = response_data['Response']['TargetText']
                print("Translated text:", repr(translated_text))
        except Exception as e:
            print("Failed to parse JSON:", str(e))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_direct_api()