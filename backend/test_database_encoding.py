#!/usr/bin/env python3
import os
import sys
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_database_encoding():
    """Test database encoding handling"""
    try:
        # Connect to database with explicit UTF-8 settings
        conn = mysql.connector.connect(
            host='192.3.164.131',
            port=3306,
            user='root',
            password='mysql_Ki48fA',
            database='project_updates',
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci',
            use_unicode=True
        )
        
        cursor = conn.cursor()
        
        # Test inserting and retrieving Chinese text
        test_text = "了解Visual Studio Code 2025年7月版本（1.103）中的新内容"
        print("Original text:", repr(test_text))
        print("Original text UTF-8 bytes:", test_text.encode('utf-8').hex())
        
        # Insert test text
        cursor.execute("CREATE TEMPORARY TABLE test_encoding (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT)")
        cursor.execute("INSERT INTO test_encoding (content) VALUES (%s)", (test_text,))
        conn.commit()
        
        # Retrieve test text
        cursor.execute("SELECT content FROM test_encoding WHERE id = 1")
        result = cursor.fetchone()
        if result:
            retrieved_text = result[0]
            print("Retrieved text:", repr(retrieved_text))
            print("Retrieved text UTF-8 bytes:", retrieved_text.encode('utf-8').hex())
            print("Texts match:", test_text == retrieved_text)
        
        # Clean up
        cursor.execute("DROP TEMPORARY TABLE test_encoding")
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_encoding()