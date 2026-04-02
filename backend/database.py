import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "history.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Initial table creation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_text TEXT,
        job_description TEXT,
        optimized_resume TEXT,
        ats_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Migration: Add user_id column if it doesn't exist
    cursor.execute("PRAGMA table_info(history)")
    columns = [row[1] for row in cursor.fetchall()]
    if "user_id" not in columns:
        try:
            cursor.execute("ALTER TABLE history ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()