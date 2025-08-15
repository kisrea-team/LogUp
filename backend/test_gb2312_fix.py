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

def test_gb2312_fix():
    """Test GB2312-based encoding fix"""
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
        
        translated_text = resp.TargetText
        print("Translated text (raw):", repr(translated_text))
        
        # Try a more direct approach
        # The issue might be that the text is UTF-8 encoded but being interpreted as latin1
        try:
            # Convert the string to bytes as if it were latin1, then decode as UTF-8
            utf8_bytes = translated_text.encode('latin1')
            fixed_text = utf8_bytes.decode('utf-8')
            print("Method 1 - Latin1 to UTF-8:", repr(fixed_text))
        except Exception as e:
            print("Method 1 failed:", str(e))
        
        # Try another approach - encode as UTF-8 and decode as GBK
        try:
            utf8_bytes = translated_text.encode('utf-8', errors='ignore')
            fixed_text = utf8_bytes.decode('gbk', errors='ignore')
            print("Method 2 - UTF-8 to GBK:", repr(fixed_text))
        except Exception as e:
            print("Method 2 failed:", str(e))
            
        # Try yet another approach - encode as GBK and decode as UTF-8
        try:
            gbk_bytes = translated_text.encode('gbk', errors='ignore')
            fixed_text = gbk_bytes.decode('utf-8', errors='ignore')
            print("Method 3 - GBK to UTF-8:", repr(fixed_text))
        except Exception as e:
            print("Method 3 failed:", str(e))
            
        # Try direct GB2312 conversion
        try:
            # If the text contains Chinese characters, it might be GB2312 encoded
            # but being interpreted as UTF-8
            latin1_bytes = translated_text.encode('latin1', errors='ignore')
            fixed_text = latin1_bytes.decode('gb2312', errors='ignore')
            print("Method 4 - Latin1 to GB2312:", repr(fixed_text))
        except Exception as e:
            print("Method 4 failed:", str(e))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_gb2312_fix()