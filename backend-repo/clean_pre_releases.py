#!/usr/bin/env python3
"""
Clean up pre-release versions from database
"""

from database import db
import re

def clean_pre_releases():
    """Remove pre-release versions from database"""
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
            print(f"\nProcessing project: {project_name}")
            
            # Get all versions for this project
            versions = db.execute_query("SELECT id, version FROM versions WHERE project_id = %s", (project_id,))
            
            if not versions:
                print("  No versions found")
                continue
            
            # Identify pre-releases
            pre_release_patterns = [
                r'.*-canary\..*',
                r'.*-alpha\..*',
                r'.*-beta\..*',
                r'.*-rc\..*',
                r'.*\.a\d+.*',  # alpha (e.g., 1.0.0a1)
                r'.*\.b\d+.*',  # beta (e.g., 1.0.0b1)
                r'.*\.rc\d+.*'  # release candidate (e.g., 1.0.0rc1)
            ]
            
            to_delete = []
            
            for v in versions:
                version = v['version']
                version_id = v['id']
                
                # Check if it matches any pre-release pattern
                for pattern in pre_release_patterns:
                    if re.match(pattern, version, re.IGNORECASE):
                        to_delete.append((version_id, version))
                        break
            
            # Delete pre-releases
            if to_delete:
                print(f"  Found {len(to_delete)} pre-release versions to delete")
                for version_id, version in to_delete:
                    db.execute_query("DELETE FROM versions WHERE id = %s", (version_id,))
                    print(f"    Deleted: {version}")
                total_deleted += len(to_delete)
            else:
                print("  No pre-releases found")
        
        print(f"\nTotal pre-releases deleted: {total_deleted}")
        print("Cleanup completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    clean_pre_releases()