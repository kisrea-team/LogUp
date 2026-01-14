import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder

load_dotenv()

class Database:
    def __init__(self):
        # Database connection settings
        self.db_host = os.getenv('DB_HOST', '192.3.164.131')
        self.db_port = int(os.getenv('DB_PORT', 3306))
        self.db_user = os.getenv('DB_USER', 'root')
        self.db_password = os.getenv('DB_PASSWORD', 'mysql_Ki48fA')
        self.db_name = os.getenv('DB_NAME', 'logup')
        
        # SSH tunnel settings
        self.ssh_host = os.getenv('SSH_HOST', self.db_host)
        self.ssh_port = int(os.getenv('SSH_PORT', 22))
        self.ssh_user = os.getenv('SSH_USER', 'root')
        # The user provided this password.
        self.ssh_password = os.getenv('SSH_PASSWORD', 'Rdw4nForZT7J565Aa7')

        self.tunnel = None
        self.connection = None

    def connect(self):
        """
        Establishes an SSH tunnel and connects to the database through it.
        """
        try:
            print(f"Attempting to establish SSH tunnel to {self.ssh_host}:{self.ssh_port}...")
            self.tunnel = SSHTunnelForwarder(
                (self.ssh_host, self.ssh_port),
                ssh_username=self.ssh_user,
                ssh_password=self.ssh_password,
                remote_bind_address=(self.db_host, self.db_port)
            )
            self.tunnel.start()
            print("SSH tunnel established successfully.")

            local_bind_port = self.tunnel.local_bind_port
            print(f"Connecting to MySQL database via SSH tunnel: localhost:{local_bind_port}")
            
            self.connection = mysql.connector.connect(
                host='127.0.0.1',
                port=local_bind_port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name,
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                use_unicode=True,
                ssl_disabled=True
            )
            print("Database connection successful.")
            return self.connection
        except Exception as e:
            print(f"Failed to connect to MySQL via SSH tunnel: {e}")
            if self.tunnel and self.tunnel.is_active:
                self.tunnel.stop()
            return None

    def disconnect(self):
        """
        Closes the database connection and the SSH tunnel.
        """
        try:
            if self.connection and self.connection.is_connected():
                # Consume any unread results before closing
                while self.connection.unread_result:
                    self.connection.get_rows()
                self.connection.close()
                print("Database connection closed.")
        except Error as e:
            print(f"Error while disconnecting from database: {e}")
        finally:
            self.connection = None

        if self.tunnel and self.tunnel.is_active:
            self.tunnel.stop()
            print("SSH tunnel closed.")
        self.tunnel = None

    def execute_query(self, query, params=None):
        cursor = None
        try:
            if not self.connection or not self.connection.is_connected():
                print("No active connection. Trying to reconnect...")
                self.connect()
            
            if not self.connection:
                print("Failed to reconnect. Cannot execute query.")
                return None

            print(f"Executing query: {query}")
            if params:
                print(f"Query params: {params}")
                
            cursor = self.connection.cursor(dictionary=True, buffered=True)
            cursor.execute(query, params)
            
            if query.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
                print(f"Query result: {len(result) if result else 0} rows")
            else:
                self.connection.commit()
                result = cursor.lastrowid
                print("Query committed.")
            
            return result
        except Error as e:
            print(f"Error executing query: {e}")
            # Attempt to reconnect on certain errors
            if e.errno in (2006, 2013): # MySQL server has gone away / Lost connection
                print("Connection error, attempting to reconnect...")
                self.disconnect()
                self.connect()
                # Optionally, you could retry the query here.
            return None
        finally:
            if cursor:
                try:
                    # Ensure all results are fetched before closing the cursor
                    while cursor.nextset():
                        pass
                    cursor.close()
                except:
                    pass

db = Database()
