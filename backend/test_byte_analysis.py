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

def analyze_bytes(text):
    """Analyze the byte representation of the text"""
    if not text or not isinstance(text, str):
        return
    
    print("Text analysis:")
    print(f"  Length: {len(text)}")
    print(f"  Characters: {repr(text)}")
    
    # Show byte representation in different encodings
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin1']
    for enc in encodings:
        try:
            encoded = text.encode(enc, errors='ignore')
            print(f"  {enc} bytes: {encoded}")
            print(f"  {enc} hex: {encoded.hex()}")
        except Exception as e:
            print(f"  {enc} encoding failed: {e}")

def test_byte_analysis():
    """Test byte analysis of Tencent translation response"""
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
        print("Original text:")
        analyze_bytes(text)
        
        # Translate
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        resp = client.TextTranslate(req)
        
        translated_text = resp.TargetText
        print("\nTranslated text:")
        analyze_bytes(translated_text)
        
        # Try to understand what the correct text should be
        expected_text = "了解 Visual Studio Code 2025年7月版本 (1.103) 中的新功能"
        print("\nExpected text:")
        analyze_bytes(expected_text)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_byte_analysis()