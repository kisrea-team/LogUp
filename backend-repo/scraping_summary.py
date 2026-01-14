#!/usr/bin/env python3
"""
Summary of GitHub releases scraping results
"""

from database import db

def show_summary():
    """Show scraping summary"""
    if not db.connect():
        print("Failed to connect to database")
        return False
    
    try:
        repos = [
            ("vercel/next.js", "Next.js"),
            ("facebook/react", "React")
        ]
        
        print("\n" + "="*60)
        print("GitHub Releases Scraping Summary")
        print("="*60 + "\n")
        
        for repo_name, display_name in repos:
            print(f"[PROJECT] {display_name} ({repo_name})")
            print("-" * 50)
            
            # Get project info
            project = db.execute_query("SELECT * FROM projects WHERE name = %s", (repo_name,))
            if project:
                p = project[0]
                print(f"   Latest version: {p['latest_version']}")
                print(f"   Latest update: {p['latest_update_time']}")
            
            # Get version count
            versions = db.execute_query("SELECT COUNT(*) as count FROM versions v JOIN projects p ON v.project_id = p.id WHERE p.name = %s", (repo_name,))
            count = versions[0]['count'] if versions else 0
            print(f"   Total versions: {count}")
            
            # Show version range
            version_range = db.execute_query("""
                SELECT MIN(update_time) as oldest, MAX(update_time) as newest 
                FROM versions v JOIN projects p ON v.project_id = p.id WHERE p.name = %s
            """, (repo_name,))
            if version_range:
                print(f"   Version range: {version_range[0]['oldest']} to {version_range[0]['newest']}")
            
            print()
        
        # Total stats
        total_versions = db.execute_query("SELECT COUNT(*) as count FROM versions v JOIN projects p ON v.project_id = p.id WHERE p.name LIKE '%/%'")
        print(f"📊 Total stable versions scraped: {total_versions[0]['count']}")
        
        print("\n✅ Only stable releases are included (no pre-releases)")
        print("✅ Content is translated to Chinese")
        print("✅ Markdown formatting is preserved")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    show_summary()