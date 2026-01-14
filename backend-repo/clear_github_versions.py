#!/usr/bin/env python3
"""
Clear all GitHub versions from database to re-fetch
"""

from database import db

def clear_github_versions():
    """Clear all versions from GitHub projects"""
    if not db.connect():
        print("Failed to connect to database")
        return False
    
    try:
        # Get all GitHub projects
        projects = db.execute_query("SELECT id, name FROM projects WHERE name LIKE '%/%'")
        
        if not projects:
            print("No GitHub projects found")
            return True
        
        total_deleted = 0
        
        for project in projects:
            project_id = project['id']
            project_name = project['name']
            print(f"\nClearing versions for: {project_name}")
            
            # Delete all versions for this project
            result = db.execute_query("DELETE FROM versions WHERE project_id = %s", (project_id,))
            if result is not None:
                deleted = db.execute_query("SELECT ROW_COUNT() as count")
                count = deleted[0]['count'] if deleted else 0
                print(f"  Deleted {count} versions")
                total_deleted += count
        
        print(f"\nTotal versions deleted: {total_deleted}")
        print("Clear completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    clear_github_versions()