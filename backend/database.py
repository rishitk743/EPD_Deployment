import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")

# Pool: min 2 connections, max 10
connection_pool = None

def init_db():
    global connection_pool
    if connection_pool is None:
        if not DATABASE_URL:
            # Fallback for local dev if DATABASE_URL is not set
            # This is just to prevent immediate crash if env is missing
            print("WARNING: DATABASE_URL not set. Database operations will fail.")
            return
        connection_pool = pool.SimpleConnectionPool(2, 10, DATABASE_URL)
    
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                resume_text TEXT,
                job_description TEXT,
                optimized_resume TEXT,
                ats_score INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        conn.commit()
    finally:
        put_connection(conn)

def get_connection():
    if connection_pool is None:
        init_db()
    return connection_pool.getconn()

def put_connection(conn):
    if connection_pool is not None:
        connection_pool.putconn(conn)