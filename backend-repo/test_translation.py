#!/usr/bin/env python3
"""
Test translation functionality
"""

import os
import sys
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.dirname(__file__)
os.chdir(backend_dir)
load_dotenv()

def test_translation():
    """Test Tencent translation API"""
    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        print(f"Testing translation with credentials:")
        print(f"Secret ID: {secret_id[:10]}...")
        print(f"Region: {region}")
        
        if not secret_id or not secret_key:
            raise ValueError("Tencent translation credentials not found")

        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile(endpoint="tmt.tencentcloudapi.com")
        client_profile = ClientProfile(httpProfile=http_profile)
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        req = models.TextTranslateRequest()
        req.SourceText = "This is a test release note for version 1.0.0"
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        resp = client.TextTranslate(req)
        
        print(f"\nOriginal: {req.SourceText}")
        print(f"Translated: {resp.TargetText}")
        
        if resp.TargetText and any('\u4e00' <= char <= '\u9fff' for char in resp.TargetText):
            print("\n[SUCCESS] Translation test successful!")
            return True
        else:
            print(f"\n[ERROR] Translation result did not contain Chinese characters")
            return False

    except Exception as e:
        print(f"\n[ERROR] Translation test failed: {e}")
        return False

if __name__ == "__main__":
    test_translation()