import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.host = '192.3.164.131'
        self.port = 3306
        self.user = 'root'
        self.password = 'mysql_Ki48fA'
        self.database = 'project_updates'
        self.connection = None

    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                use_unicode=True,
                ssl_disabled=True  # Disable SSL to avoid connection issues
            )
            return self.connection
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return None

    def disconnect(self):
        try:
            if self.connection and self.connection.is_connected():
                # Consume any unread results before closing
                while self.connection.unread_result:
                    self.connection.get_rows()
                self.connection.close()
        except Error as e:
            print(f"Error disconnecting from database: {e}")
        finally:
            self.connection = None

    def execute_query(self, query, params=None):
        cursor = None
        try:
            cursor = self.connection.cursor(dictionary=True, buffered=True)
            cursor.execute(query, params)
            if query.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
                # Ensure we consume all results
                while cursor.nextset():
                    pass
            else:
                self.connection.commit()
                result = cursor.lastrowid
            return result
        except Error as e:
            print(f"Error executing query: {e}")
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass

db = Database()