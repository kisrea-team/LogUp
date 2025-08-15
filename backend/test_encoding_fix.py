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

def test_encoding_fix():
    """Test different approaches to fix encoding issues"""
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
        
        # Method 1: Direct translation
        req1 = models.TextTranslateRequest()
        req1.SourceText = text
        req1.Source = "en"
        req1.Target = "zh"
        req1.ProjectId = 0
        resp1 = client.TextTranslate(req1)
        print("Method 1 - Direct translation:")
        print("  Result:", repr(resp1.TargetText))
        
        # Method 2: Encode as UTF-8 bytes then translate
        text_utf8 = text.encode('utf-8')
        req2 = models.TextTranslateRequest()
        req2.SourceText = text
        req2.Source = "en"
        req2.Target = "zh"
        req2.ProjectId = 0
        resp2 = client.TextTranslate(req2)
        result2 = resp2.TargetText
        print("Method 2 - UTF-8 encoded:")
        print("  Result:", repr(result2))
        
        # Method 3: Try to fix encoding after translation
        if '' in result2:
            try:
                # Try latin1 to utf-8 conversion
                fixed = result2.encode('latin1').decode('utf-8')
                print("Method 3 - Latin1 to UTF-8 fix:")
                print("  Fixed result:", repr(fixed))
            except Exception as e:
                print("Method 3 failed:", str(e))
        
        # Method 4: Try different encoding conversions
        try:
            # Try GBK encoding
            result_bytes = result2.encode('utf-8', errors='ignore')
            fixed_gbk = result_bytes.decode('gbk', errors='ignore')
            print("Method 4 - GBK decoding:")
            print("  Fixed result:", repr(fixed_gbk))
        except Exception as e:
            print("Method 4 failed:", str(e))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_encoding_fix()