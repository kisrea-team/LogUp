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
        SELECT id, name, latest_version 
        FROM projects 
        ORDER BY latest_update_time DESC
        """
        projects_data = db.execute_query(projects_query)
        print(f"Found {len(projects_data)} projects")
        
        if projects_data:
            for i, project in enumerate(projects_data):
                print(f"Project {i+1}: ID={project['id']}, Name={project['name']}, Latest Version={project['latest_version']}")
                if i >= 2:  # Only show first 3 projects
                    break
            
            # Test fetching versions for the first project
            project_id = projects_data[0]['id']
            versions_query = """
            SELECT COUNT(*) as version_count
            FROM versions 
            WHERE project_id = %s
            """
            versions_data = db.execute_query(versions_query, (project_id,))
            print(f"Found {versions_data[0]['version_count']} versions for project {project_id}")
        
        db.disconnect()
    else:
        print("Failed to connect to database")

def test_api():
    """Test API endpoint"""
    print("\nTesting API endpoint...")
    try:
        response = requests.get('http://localhost:8000/projects', timeout=10)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {response.headers.get('content-type')}")
        print(f"Response content length: {len(response.text)}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Parsed JSON, found {len(data)} projects")
                for i, project in enumerate(data):
                    print(f"Project {i+1}: ID={project['id']}, Name={project['name']}, Latest Version={project['latest_version']}")
                    if i >= 2:  # Only show first 3 projects
                        break
                        
                    # Show versions count
                    print(f"  Versions: {len(project.get('versions', []))}")
                    if i >= 1:  # Only show versions for first 2 projects
                        break
            except Exception as e:
                print(f"Failed to parse JSON: {e}")
                print("Response text preview:", response.text[:200])
        else:
            print("Error response:", response.text[:200])
    except Exception as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    test_database()
    test_api()