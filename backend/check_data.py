#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db

def check_data():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Check VS Code project
        result = db.execute_query("SELECT id, name FROM projects WHERE name = 'Visual Studio Code'")
        print(f"VS Code project: {result}")
        
        if result:
            project_id = result[0]['id']
            print(f"Project ID: {project_id}")
            
            # Check latest versions
            versions = db.execute_query(
                "SELECT version, update_time, content FROM versions WHERE project_id = %s ORDER BY update_time DESC LIMIT 3", 
                (project_id,)
            )
            print("Latest 3 versions:")
            for v in versions:
                print(f"  {v['version']}: {v['update_time']}")
                # Check if content has Chinese characters
                content_preview = v['content'][:100].replace('\n', ' ')
                has_chinese = any(ord(c) > 127 for c in content_preview)
                print(f"    Content preview: {content_preview}...")
                print(f"    Has non-ASCII chars: {has_chinese}")
                print()
    finally:
        db.disconnect()

if __name__ == "__main__":
    check_data()