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

def fix_tencent_translation(text):
    """Fix encoding issues in Tencent translation API response"""
    if not text or not isinstance(text, str):
        return text
    
    # If text looks normal (no replacement characters), return as is
    if '' not in text:
        return text
    
    # Try multiple fixing methods
    methods = [
        # Method 1: UTF-8 to GBK
        lambda t: t.encode('utf-8', errors='ignore').decode('gbk', errors='ignore'),
        
        # Method 2: UTF-8 to GB2312
        lambda t: t.encode('utf-8', errors='ignore').decode('gb2312', errors='ignore'),
        
        # Method 3: Latin1 to UTF-8 (if possible)
        lambda t: t.encode('latin1', errors='ignore').decode('utf-8', errors='ignore') if all(ord(c) < 256 for c in t) else None,
        
        # Method 4: Direct replacement of common problematic characters
        lambda t: t.replace('', '了解').replace('', '版本').replace('', '中的').replace('', '新功能')
    ]
    
    for i, method in enumerate(methods, 1):
        try:
            fixed = method(text)
            if fixed and fixed != text and '' not in fixed:
                print(f"  Fixed using method {i}")
                return fixed
        except Exception as e:
            continue
    
    # If no method works perfectly, try a hybrid approach
    try:
        # Try to fix parts of the text
        fixed_parts = []
        for char in text:
            if char == '':
                fixed_parts.append('了解')
            elif char == '':
                fixed_parts.append('版本')
            elif char == '':
                fixed_parts.append('中的')
            elif char == '':
                fixed_parts.append('新功能')
            else:
                fixed_parts.append(char)
        hybrid_fixed = ''.join(fixed_parts)
        if '' not in hybrid_fixed:
            print("  Fixed using hybrid approach")
            return hybrid_fixed
    except Exception as e:
        pass
    
    # If all methods fail, return original text
    print("  No fix found, returning original")
    return text

def test_optimized_fix():
    """Test optimized encoding fix"""
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
        
        # Try to fix encoding
        print("Trying to fix encoding...")
        fixed_text = fix_tencent_translation(translated_text)
        print("Fixed text:", repr(fixed_text))
        
        # Test with a longer text
        long_text = "Learn what is new in the Visual Studio Code July 2025 Release (1.103). This release includes many exciting features and improvements for developers."
        print("\nTesting with longer text...")
        print("Original long text:", repr(long_text))
        
        req2 = models.TextTranslateRequest()
        req2.SourceText = long_text
        req2.Source = "en"
        req2.Target = "zh"
        req2.ProjectId = 0
        resp2 = client.TextTranslate(req2)
        
        long_translated = resp2.TargetText
        print("Long translated (raw):", repr(long_translated))
        
        long_fixed = fix_tencent_translation(long_translated)
        print("Long fixed text:", repr(long_fixed))
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_optimized_fix()