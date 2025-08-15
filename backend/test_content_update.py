#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db
from scraper import translate_to_chinese_sync

def test_content_update():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Test with a real translation
        original_content = "Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
        translated_content = translate_to_chinese_sync(original_content)
        
        print(f"Original: {original_content}")
        print(f"Translated: {translated_content}")
        print(f"Has Chinese: {any(ord(c) > 127 for c in translated_content)}")
        
        # Update database with translated content
        project_id = 4  # VS Code project ID
        version = 'v1.103'
        
        update_result = db.execute_query(
            "UPDATE versions SET content = %s WHERE project_id = %s AND version = %s",
            (translated_content, project_id, version)
        )
        print(f"Update result: {update_result}")
        
        # Verify update
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (project_id, version)
        )
        if result:
            db_content = result[0]['content']
            print(f"Database content: {db_content}")
            print(f"Database content length: {len(db_content)}")
            print(f"Database has Chinese: {any(ord(c) > 127 for c in db_content)}")
            
            # Compare content
            print(f"Content matches: {db_content == translated_content}")
        else:
            print("Failed to retrieve updated content")
    finally:
        db.disconnect()

if __name__ == "__main__":
    test_content_update()