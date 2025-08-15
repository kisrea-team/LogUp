#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models

# Load environment variables
load_dotenv()

def test_tencent_translate():
    """Test Tencent Translate API directly"""
    try:
        # Get credentials from environment variables
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        print("Secret ID:", secret_id[:10] if secret_id else "Not found")
        print("Secret Key:", secret_key[:10] if secret_key else "Not found")
        print("Region:", region)
        
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
        
        # Create request object
        req = models.TextTranslateRequest()
        req.SourceText = "Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        # Send request
        print("Sending translation request...")
        resp = client.TextTranslate(req)
        
        # Print response
        print("Translation result:")
        print("Source text:", repr(req.SourceText))
        print("Target text:", repr(resp.TargetText))
        print("Target text type:", type(resp.TargetText))
        
        # Check if target text is bytes and decode if necessary
        if isinstance(resp.TargetText, bytes):
            decoded_text = resp.TargetText.decode('utf-8')
            print("Decoded text:", repr(decoded_text))
        
    except Exception as e:
        print(f"Translation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_tencent_translate()