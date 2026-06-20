import sqlite3
import os

DB_FILE = "violations.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            preprocessed_filename TEXT,
            annotated_filename TEXT,
            timestamp TEXT NOT NULL,
            location TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            violations TEXT,
            license_plate TEXT,
            confidence REAL,
            processing_time_ms INTEGER
        )
    """)
    conn.commit()
    conn.close()
