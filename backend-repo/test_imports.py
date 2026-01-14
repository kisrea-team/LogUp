#!/usr/bin/env python3
"""
Comprehensive test script to check all module imports and dependencies
"""
import sys
import os

def test_all_imports():
    print("=== Comprehensive Module Import Test ===")
    
    # Add current directory to path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    print(f"Working directory: {os.getcwd()}")
    print(f"Current directory: {current_dir}")
    print(f"Python path: {sys.path}")
    
    # Test 1: Import models.py
    print("\n--- Test 1: Importing models.py ---")
    try:
        from models import Project, ProjectCreate, Version, VersionCreate
        print("[OK] Successfully imported from models.py")
        print(f"  Project: {Project}")
        print(f"  Version: {Version}")
    except Exception as e:
        print(f"[ERROR] Failed to import from models.py: {e}")
        return False
    
    # Test 2: Import database.py
    print("\n--- Test 2: Importing database.py ---")
    try:
        from database import db
        print("[OK] Successfully imported db from database.py")
        print(f"  Database class: {db.__class__}")
    except Exception as e:
        print(f"[ERROR] Failed to import from database.py: {e}")
        return False
    
    # Test 3: Import main.py (this imports models and database)
    print("\n--- Test 3: Importing main.py ---")
    try:
        from main import app
        print("[OK] Successfully imported app from main.py")
        print(f"  App title: {getattr(app, 'title', 'No title')}")
        print(f"  App routes count: {len(app.routes)}")
    except Exception as e:
        print(f"[ERROR] Failed to import from main.py: {e}")
        # Let's check what's in main.py that might cause issues
        try:
            with open('main.py', 'r', encoding='utf-8') as f:
                lines = f.readlines()
                print("First 20 lines of main.py:")
                for i, line in enumerate(lines[:20]):
                    print(f"  {i+1:2d}: {line.rstrip()}")
        except Exception as read_error:
            print(f"  Could not read main.py: {read_error}")
        return False
    
    print("\n=== All tests passed! ===")
    return True

if __name__ == "__main__":
    success = test_all_imports()
    sys.exit(0 if success else 1)