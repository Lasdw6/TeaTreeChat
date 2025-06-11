import sqlite3
import os

def migrate():
    # Connect to the SQLite database
    conn = sqlite3.connect('chat.db')
    cursor = conn.cursor()
    
    try:
        # Add regeneration_id column to messages table
        cursor.execute('ALTER TABLE messages ADD COLUMN regeneration_id TEXT')
        conn.commit()
        print("Migration completed successfully!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column already exists, skipping migration.")
        else:
            raise e
    finally:
        conn.close()

if __name__ == "__main__":
    migrate() 