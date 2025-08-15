#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db
from scraper import translate_to_chinese_sync, save_versions_to_db

def test_save_function():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Test with translated content
        original_content = "Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
        translated_content = translate_to_chinese_sync(original_content)
        
        print(f"Original: {original_content}")
        print(f"Translated: {translated_content}")
        print(f"Has Chinese: {any(ord(c) > 127 for c in translated_content)}")
        
        # Test data that mimics what scraper would pass to save_versions_to_db
        test_data = [{
            'version': 'v1.103',
            'update_date': '2025-07-01',
            'content': translated_content,
            'download_url': 'https://code.visualstudio.com/updates/v1.103',
            'project_id': 4,
            'is_new': False  # This will trigger an update, not insert
        }]
        
        print(f"Test data content length: {len(test_data[0]['content'])}")
        
        # Call the save function
        print("Calling save_versions_to_db...")
        result = save_versions_to_db(test_data)
        print(f"Save result: {result}")
        
        # Verify update
        print("Verifying update...")
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (4, 'v1.103')
        )
        if result:
            db_content = result[0]['content']
            print(f"Database content length: {len(db_content)}")
            print(f"Database content preview: {db_content[:100]}")
            print(f"Database has Chinese: {any(ord(c) > 127 for c in db_content)}")
            
            # Compare content
            print(f"Content matches: {db_content == translated_content}")
            if db_content != translated_content:
                print("Content mismatch detected!")
                print(f"Expected length: {len(translated_content)}")
                print(f"Actual length: {len(db_content)}")
        else:
            print("Failed to retrieve updated content")
    finally:
        db.disconnect()

if __name__ == "__main__":
    test_save_function()