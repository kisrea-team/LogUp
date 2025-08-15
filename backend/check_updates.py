#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db

def check_before_after():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Get content before update
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (4, 'v1.103')
        )
        if result:
            old_content = result[0]['content']
            print(f"Before update - Content length: {len(old_content)}")
            print(f"Before update - Content preview: {old_content[:100]}")
            print(f"Before update - Has Chinese: {any(ord(c) > 127 for c in old_content)}")
        else:
            print("Version not found")
            return
            
        # Update with a simple test
        test_content = "这是一个测试内容，用来验证数据库更新功能是否正常工作。"
        update_result = db.execute_query(
            "UPDATE versions SET content = %s WHERE project_id = %s AND version = %s",
            (test_content, 4, 'v1.103')
        )
        print(f"Direct update result: {update_result}")
        
        # Get content after direct update
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (4, 'v1.103')
        )
        if result:
            new_content = result[0]['content']
            print(f"After direct update - Content length: {len(new_content)}")
            print(f"After direct update - Content: {new_content}")
            print(f"After direct update - Has Chinese: {any(ord(c) > 127 for c in new_content)}")
            
        # Now run scraper update simulation
        scraper_content = "Scraper更新的内容：Learn what is new in the Visual Studio Code July 2025 Release (1.103)"
        update_result = db.execute_query(
            "UPDATE versions SET content = %s WHERE project_id = %s AND version = %s",
            (scraper_content, 4, 'v1.103')
        )
        print(f"Scraper simulation update result: {update_result}")
        
        # Get content after scraper simulation
        result = db.execute_query(
            "SELECT content FROM versions WHERE project_id = %s AND version = %s",
            (4, 'v1.103')
        )
        if result:
            scraper_updated_content = result[0]['content']
            print(f"After scraper update - Content length: {len(scraper_updated_content)}")
            print(f"After scraper update - Content: {scraper_updated_content}")
            print(f"After scraper update - Has Chinese: {any(ord(c) > 127 for c in scraper_updated_content)}")
            
    finally:
        db.disconnect()

if __name__ == "__main__":
    check_before_after()