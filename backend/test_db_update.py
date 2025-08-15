#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db

def test_database_update():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Test a simple update
        project_id = 4  # VS Code project ID
        version = 'v1.103'
        
        # Get current content
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (project_id, version)
        )
        if result:
            old_content = result[0]['content']
            print(f"Old content length: {len(old_content)}")
            print(f"Old content preview: {old_content[:100]}")
            
            # Update with test content
            test_content = "测试中文内容 Test Chinese content"
            update_result = db.execute_query(
                "UPDATE versions SET content = %s WHERE project_id = %s AND version = %s",
                (test_content, project_id, version)
            )
            print(f"Update result: {update_result}")
            
            # Verify update
            result = db.execute_query(
                "SELECT content FROM versions WHERE project_id = %s AND version = %s",
                (project_id, version)
            )
            if result:
                new_content = result[0]['content']
                print(f"New content: {new_content}")
                print(f"Has Chinese: {any(ord(c) > 127 for c in new_content)}")
        else:
            print("Version not found")
    finally:
        db.disconnect()

if __name__ == "__main__":
    test_database_update()