#!/usr/bin/env python3
"""
Quick update for remaining GitHub releases
"""

from database import db
import os
import sys

def quick_update():
    """Quick update remaining versions"""
    try:
        if not db.connect():
            print("Failed to connect to database")
            return False

        # Get remaining versions that haven't been updated (check for newlines)
        query = """
            SELECT v.id, v.version, v.content, p.name as project_name
            FROM versions v
            JOIN projects p ON v.project_id = p.id
            WHERE p.name LIKE '%/%' 
            AND v.content NOT LIKE '%\n%'
            ORDER BY v.update_time DESC
            LIMIT 50
        """
        versions = db.execute_query(query)
        
        if not versions:
            print("No more versions to update")
            return True
        
        print(f"Found {len(versions)} versions to update")
        
        # Update with simple formatting (add newlines for list items)
        for v in versions:
            version_id = v['id']
            version = v['version']
            content = v['content']
            
            print(f"Updating {version}...")
            
            # Simple formatting: replace bullet points with newlines
            if content and '- ' in content:
                # Split by lines and reformat
                lines = content.split()
                formatted_lines = []
                current_line = []
                
                for word in lines:
                    if word == '-':
                        if current_line:
                            formatted_lines.append(' '.join(current_line))
                            current_line = []
                        formatted_lines.append('-')
                    else:
                        current_line.append(word)
                
                if current_line:
                    formatted_lines.append(' '.join(current_line))
                
                # Join with newlines and ensure headers are on their own lines
                formatted_content = '\n'.join(formatted_lines)
                formatted_content = formatted_content.replace('#', '\n#')
                formatted_content = formatted_content.replace('\n\n#', '\n#')
                formatted_content = formatted_content.strip()
                
                # Update database
                update_query = "UPDATE versions SET content = %s WHERE id = %s"
                db.execute_query(update_query, (formatted_content, version_id))
                print(f"  Updated")

        print("\nQuick update completed!")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    quick_update()