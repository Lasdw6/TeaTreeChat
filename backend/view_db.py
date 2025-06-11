import sqlite3
from tabulate import tabulate

def view_table(cursor, table_name):
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    if rows:
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Truncate content in messages table
        if table_name == "messages":
            rows = list(rows)  # Convert to list to allow modification
            for i, row in enumerate(rows):
                row = list(row)  # Convert tuple to list
                content_index = columns.index("content")
                if row[content_index]:  # Check if content exists
                    row[content_index] = row[content_index][:50] + "..." if len(row[content_index]) > 50 else row[content_index]
                rows[i] = tuple(row)  # Convert back to tuple
        
        print(f"\n=== {table_name.upper()} ===")
        print(tabulate(rows, headers=columns, tablefmt="grid"))
    else:
        print(f"\nNo data in {table_name}")

def main():
    try:
        conn = sqlite3.connect('chat.db')
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        for table in tables:
            view_table(cursor, table[0])
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 