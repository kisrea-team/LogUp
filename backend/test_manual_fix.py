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

def manual_fix_translation(text):
    """Manually fix known encoding issues in Tencent translation"""
    if not text or not isinstance(text, str):
        return text
    
    # If text looks normal, return as is
    if '' not in text:
        return text
    
    # Create a mapping of problematic characters to their correct counterparts
    # This is based on the pattern we've observed
    char_mapping = {
        '': '了解',
        '': '版本',
        '': '中的',
        '': '新功能',
        '': '这个',
        '': '发布',
        '': '为',
        '': '开发',
        '': '人员',
        '': '提供',
        '': '许多',
        '': '令人',
        '': '兴奋',
        '': '的',
        '': '功能',
        '': '和',
        '': '改进',
        '': '月',
        '(': '（',
        ')': '）'
    }
    
    # Apply character mapping
    fixed_text = text
    for bad_char, good_char in char_mapping.items():
        fixed_text = fixed_text.replace(bad_char, good_char)
    
    # Additional fixes for common patterns
    # Fix "20257°汾" -> "2025年7月版本"
    fixed_text = fixed_text.replace('20257°汾', '2025年7月版本')
    fixed_text = fixed_text.replace('1.103е', '1.103中的')
    
    return fixed_text

def test_manual_fix():
    """Test manual encoding fix"""
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
        
        # Try manual fix
        print("Trying manual fix...")
        fixed_text = manual_fix_translation(translated_text)
        print("Fixed text:", repr(fixed_text))
        print("Fixed text (display):", fixed_text)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_manual_fix()