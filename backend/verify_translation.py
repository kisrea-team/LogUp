#!/usr/bin/env python3
import sys
import os

# Ensure the backend directory is in the path
backend_dir = os.path.dirname(__file__)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models

def verify_translation():
    """
    A simple test to verify the Tencent Translation API is working correctly.
    """
    # Explicitly specify the path to the .env file
    dotenv_path = os.path.join(backend_dir, '.env')
    print(f"Loading .env file from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)

    test_text = "This is a test of the translation service."
    print(f"Original text: '{test_text}'")

    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')

        if not secret_id or not secret_key:
            print("\nError: Tencent Cloud credentials not found in .env file.")
            print("Please ensure TENCENT_SECRET_ID and TENCENT_SECRET_KEY are set.")
            return

        print("Credentials loaded successfully.")
        
        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile(endpoint="tmt.tencentcloudapi.com")
        client_profile = ClientProfile(httpProfile=http_profile)
        client = tmt_client.TmtClient(cred, "ap-beijing", client_profile)
        
        req = models.TextTranslateRequest()
        req.SourceText = test_text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        print("Sending request to Tencent Translate API...")
        resp = client.TextTranslate(req)
        
        print("\n--- Translation Result ---")
        print(f"Translated text: '{resp.TargetText}'")
        
        has_chinese = any('\u4e00' <= char <= '\u9fff' for char in resp.TargetText)
        if has_chinese:
            print("Verification successful: The result contains Chinese characters.")
        else:
            print("Verification FAILED: The result does NOT contain Chinese characters.")
        print("--------------------------")

    except Exception as e:
        print(f"\nAn error occurred during translation test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_translation()