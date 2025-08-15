#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import db
from models import Project, Version

def debug_api_endpoint():
    """Debug the API endpoint logic step by step"""
    print("Debugging /projects API endpoint...")
    
    try:
        # Connect to database
        if not db.connect():
            print("Failed to connect to database")
            return
            
        print("Database connected successfully")
        
        # Step 1: Get all projects
        print("\nStep 1: Getting all projects...")
        projects_query = """
        SELECT id, icon, name, latest_version, latest_update_time 
        FROM projects 
        ORDER BY latest_update_time DESC
        """
        projects_data = db.execute_query(projects_query)
        print(f"Projects query returned {len(projects_data) if projects_data else 0} rows")
        
        if not projects_data:
            print("No projects found in database")
            db.disconnect()
            return
            
        print("Projects data:")
        for i, project in enumerate(projects_data):
            print(f"  {i+1}. ID: {project['id']}, Name: {project['name']}, Latest: {project['latest_version']}")
            
        # Step 2: Process each project
        projects = []
        for i, project_data in enumerate(projects_data):
            print(f"\nStep 2.{i+1}: Processing project {project_data['id']}...")
            
            # Get versions for this project
            versions_query = """
            SELECT id, project_id, version, update_time, content, download_url 
            FROM versions 
            WHERE project_id = %s 
            ORDER BY update_time DESC
            """
            versions_data = db.execute_query(versions_query, (project_data['id'],))
            print(f"  Found {len(versions_data) if versions_data else 0} versions")
            
            if versions_data:
                print(f"  First version: ID={versions_data[0]['id']}, Version={versions_data[0]['version']}")
            
            # Try to create Version objects
            try:
                versions = [Version(**version) for version in versions_data] if versions_data else []
                print(f"  Created {len(versions)} Version objects")
            except Exception as e:
                print(f"  Error creating Version objects: {e}")
                print("  Version data sample:", versions_data[0] if versions_data else "No data")
                db.disconnect()
                return
                
            # Try to create Project object
            try:
                project = Project(
                    **project_data,
                    versions=versions
                )
                projects.append(project)
                print(f"  Created Project object: {project.name}")
            except Exception as e:
                print(f"  Error creating Project object: {e}")
                print("  Project data:", project_data)
                db.disconnect()
                return
                
        print(f"\nStep 3: Final result - Created {len(projects)} Project objects")
        
        # Convert to JSON-like structure
        result = []
        for project in projects:
            project_dict = {
                "id": project.id,
                "icon": project.icon,
                "name": project.name,
                "latest_version": project.latest_version,
                "latest_update_time": project.latest_update_time,
                "versions": [
                    {
                        "id": version.id,
                        "project_id": version.project_id,
                        "version": version.version,
                        "update_time": version.update_time,
                        "content": version.content[:100] + "..." if len(version.content) > 100 else version.content,
                        "download_url": version.download_url
                    }
                    for version in project.versions
                ]
            }
            result.append(project_dict)
            
        print(f"Final JSON result would contain {len(result)} projects")
        if result:
            print("First project preview:")
            print(f"  Name: {result[0]['name']}")
            print(f"  Versions: {len(result[0]['versions'])}")
            
        db.disconnect()
        
    except Exception as e:
        print(f"Error in debug_api: {e}")
        import traceback
        traceback.print_exc()
        if db.connection:
            db.disconnect()

if __name__ == "__main__":
    debug_api_endpoint()