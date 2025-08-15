#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db

def check_detailed_data():
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
            
            # Check one specific version with full content
            version = db.execute_query(
                "SELECT version, update_time, content FROM versions WHERE project_id = %s AND version = %s", 
                (project_id, 'v1.103')
            )
            if version:
                v = version[0]
                print(f"Version: {v['version']}")
                print(f"Update time: {v['update_time']}")
                print(f"Content length: {len(v['content'])}")
                print(f"Content preview: {v['content'][:200]}")
                # Check if content has Chinese characters
                has_chinese = any(ord(c) > 127 for c in v['content'])
                print(f"Has non-ASCII chars: {has_chinese}")
                if has_chinese:
                    # Show first Chinese characters found
                    for i, c in enumerate(v['content'][:100]):
                        if ord(c) > 127:
                            print(f"First non-ASCII char at position {i}: '{c}' (ord: {ord(c)})")
                            break
            else:
                print("Version not found")
    finally:
        db.disconnect()

if __name__ == "__main__":
    check_detailed_data()