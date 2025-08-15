#!/usr/bin/env python3
import sys
import os

# Change to backend directory to load .env correctly
backend_dir = os.path.join(os.path.dirname(__file__))
os.chdir(backend_dir)
print(f"Current directory: {os.getcwd()}")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()
print(f"Loaded .env from: {os.path.join(backend_dir, '.env')}")

# Import translation components
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models

def test_translation_detailed():
    # Test translation function with detailed debugging
    test_text = "Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
    print(f"Original text: {test_text}")
    
    try:
        # Load environment variables
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        print(f"Secret ID: {secret_id[:5] if secret_id else 'None'}...")
        print(f"Secret Key: {secret_key[:5] if secret_key else 'None'}...")
        print(f"Region: {region}")
        
        if not secret_id or not secret_key:
            print("Error: Tencent translation credentials not found")
            return
            
        # Create credential
        cred = credential.Credential(secret_id, secret_key)
        
        # Create client
        http_profile = HttpProfile()
        http_profile.endpoint = "tmt.tencentcloudapi.com"
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        # Create request
        req = models.TextTranslateRequest()
        req.SourceText = test_text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        print("Sending translation request...")
        resp = client.TextTranslate(req)
        
        print(f"Response: {resp}")
        print(f"TargetText: {resp.TargetText}")
        print(f"Response type: {type(resp.TargetText)}")
        
        # Check if translation worked
        has_chinese = any(ord(c) > 127 for c in resp.TargetText)
        print(f"Contains Chinese characters: {has_chinese}")
        
    except Exception as e:
        print(f"Translation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_translation_detailed()