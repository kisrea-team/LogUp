#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
import json

# Load environment variables
load_dotenv()

def test_raw_response():
    """Test to understand the raw response from Tencent API"""
    try:
        # Get credentials from environment variables
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        if not secret_id or not secret_key:
            print("Error: Tencent translation credentials not found")
            return
            
        # Create authentication object
        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile()
        http_profile.endpoint = "tmt.tencentcloudapi.com"
        
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        # Test text
        text = "Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
        print("Original text:", repr(text))
        
        # Translate
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        resp = client.TextTranslate(req)
        
        # Check the raw response
        print("Response object:", type(resp))
        print("TargetText attribute:", type(resp.TargetText))
        print("TargetText value:", repr(resp.TargetText))
        
        # Try to access the raw response data
        try:
            # Convert response to JSON to see raw data
            resp_json = resp.to_json_string()
            print("Response JSON:", resp_json)
        except Exception as e:
            print("Could not convert to JSON:", str(e))
            
        # Try to check if there's encoding info in the response
        try:
            # Check if response has encoding attributes
            print("Response dir:", [attr for attr in dir(resp) if not attr.startswith('_')])
        except Exception as e:
            print("Could not check response attributes:", str(e))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_raw_response()