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

def fix_encoding(text):
    """Try multiple methods to fix encoding issues"""
    if not text or not isinstance(text, str):
        return text
    
    # If text looks normal, return as is
    if '' not in text:
        return text
    
    # Try different encoding fixes
    encodings_to_try = [
        ('utf-8', 'gbk'),
        ('gbk', 'utf-8'),
        ('latin1', 'utf-8'),
        ('utf-8', 'latin1'),
        ('cp1252', 'utf-8'),
    ]
    
    for from_enc, to_enc in encodings_to_try:
        try:
            # Try to encode and decode with different encodings
            text_bytes = text.encode(from_enc, errors='ignore')
            fixed_text = text_bytes.decode(to_enc, errors='ignore')
            # If the fixed text looks better (no replacement characters), return it
            if '' not in fixed_text:
                return fixed_text
        except Exception as e:
            continue
    
    # If all methods fail, return original text
    return text

def test_advanced_encoding_fix():
    """Test advanced encoding fix approaches"""
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
        fixed_text = fix_encoding(translated_text)
        print("Fixed text:", repr(fixed_text))
        
        # Also try a more direct approach
        try:
            # Sometimes the issue is that the text is double-encoded
            if isinstance(translated_text, str):
                # Try to encode as latin1 and decode as utf-8
                fixed_direct = translated_text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
                print("Direct fix:", repr(fixed_direct))
        except Exception as e:
            print("Direct fix failed:", str(e))
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_advanced_encoding_fix()