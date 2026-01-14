#!/usr/bin/env python3
"""
Deployment start script with robust module path handling
"""
import sys
import os

def setup_python_path():
    """Ensure all modules can be imported correctly"""
    # Get the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Add script directory to Python path if not already present
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
        print(f"Added to Python path: {script_dir}")
    
    # Print debug information
    print(f"Script directory: {script_dir}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path[:3]}...")  # Show first 3 paths
    
    # List available Python files
    py_files = [f for f in os.listdir(script_dir) if f.endswith('.py')]
    print(f"Available Python files: {sorted(py_files)}")

def main():
    """Main entry point"""
    setup_python_path()
    
    try:
        print("Attempting to import app from main.py...")
        from main import app
        print("[SUCCESS] Successfully imported FastAPI app")
        return app
    except ImportError as e:
        print(f"[ERROR] Failed to import app from main.py: {e}")
        print("This might be due to:")
        print("1. main.py file not found")
        print("2. Missing dependencies in requirements.txt")
        print("3. Syntax errors in main.py or imported modules")
        raise

if __name__ == "__main__":
    try:
        app = main()
        import uvicorn
        print("Starting uvicorn server...")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(os.environ.get("PORT", 8000)),
            log_level="info"
        )
    except Exception as e:
        print(f"[FATAL] Failed to start application: {e}")
        sys.exit(1)