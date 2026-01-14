#!/usr/bin/env python3
"""
Debug script to test module imports and paths
"""
import sys
import os

def debug_imports():
    print("=== Debug Information ===")
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Script location: {os.path.abspath(__file__)}")
    print(f"Python path: {sys.path}")
    
    # List files in current directory
    current_dir = os.getcwd()
    print(f"Files in current directory: {os.listdir(current_dir)}")
    
    # Try to import modules
    try:
        print("\n=== Testing Module Imports ===")
        from main import app
        print("[OK] Successfully imported app from main.py")
        print(f"  App type: {type(app)}")
        print(f"  App title: {getattr(app, 'title', 'No title')}")
    except ImportError as e:
        print(f"[ERROR] Failed to import app from main.py: {e}")
        return False
    
    try:
        from models import Project, Version
        print("[OK] Successfully imported Project and Version from models.py")
    except ImportError as e:
        print(f"[ERROR] Failed to import from models.py: {e}")
        return False
    
    try:
        from database import db
        print("[OK] Successfully imported db from database.py")
    except ImportError as e:
        print(f"[ERROR] Failed to import from database.py: {e}")
        return False
    
    print("\n=== All imports successful! ===")
    return True

if __name__ == "__main__":
    success = debug_imports()
    sys.exit(0 if success else 1)