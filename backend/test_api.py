#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import db
import requests
import json

def test_database():
    """Test database connection"""
    print("Testing database connection...")
    if db.connect():
        print("Database connected successfully")
        
        # Test fetching projects
        print("Fetching projects...")
        projects_query = """
        SELECT id, icon, name, latest_version, latest_update_time 
        FROM projects 
        ORDER BY latest_update_time DESC
        """
        projects_data = db.execute_query(projects_query)
        print(f"Found {len(projects_data)} projects")
        
        if projects_data:
            print("First project:", projects_data[0])
            
            # Test fetching versions for the first project
            project_id = projects_data[0]['id']
            versions_query = """
            SELECT id, project_id, version, update_time, content, download_url 
            FROM versions 
            WHERE project_id = %s 
            ORDER BY update_time DESC
            """
            versions_data = db.execute_query(versions_query, (project_id,))
            print(f"Found {len(versions_data)} versions for project {project_id}")
            
            if versions_data:
                print("First version:", versions_data[0])
        
        db.disconnect()
    else:
        print("Failed to connect to database")

def test_api():
    """Test API endpoint"""
    print("\nTesting API endpoint...")
    try:
        response = requests.get('http://localhost:8000/projects', timeout=10)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {response.headers}")
        print(f"Response content length: {len(response.text)}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Parsed JSON, found {len(data)} projects")
                if data:
                    print("First project:", data[0])
            except Exception as e:
                print(f"Failed to parse JSON: {e}")
                print("Response text:", response.text[:500])
        else:
            print("Response text:", response.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_database()
    test_api()