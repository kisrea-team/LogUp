#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db

def check_updated_content():
    if not db.connect():
        print("Failed to connect to database")
        return
    
    try:
        # Check a specific version content
        result = db.execute_query(
            "SELECT version, content, LENGTH(content) as content_length FROM versions WHERE project_id = %s AND version = %s",
            (4, 'v1.103')
        )
        if result:
            version_data = result[0]
            print(f"Version: {version_data['version']}")
            print(f"Content length: {version_data['content_length']}")
            print(f"Content preview: {version_data['content'][:200]}")
            print(f"Has non-ASCII chars: {any(ord(c) > 127 for c in version_data['content'])}")
            
            # Check a few more versions to confirm update
            print("\nChecking a few more versions:")
            more_results = db.execute_query(
                "SELECT version, LENGTH(content) as content_length FROM versions WHERE project_id = %s ORDER BY update_time DESC LIMIT 5",
                (4,)
            )
            for row in more_results:
                print(f"  {row['version']}: length {row['content_length']}")
        else:
            print("Version not found")
    finally:
        db.disconnect()

if __name__ == "__main__":
    check_updated_content()