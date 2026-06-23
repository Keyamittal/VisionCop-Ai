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
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rto_registry (
            license_plate TEXT PRIMARY KEY,
            owner_name TEXT NOT NULL,
            owner_email TEXT,
            owner_phone TEXT,
            vehicle_model TEXT,
            registration_date TEXT,
            insurance_valid_until TEXT
        )
    """)
    
    # Check if rto_registry has mock data, if not seed it
    cursor.execute("SELECT COUNT(*) FROM rto_registry")
    if cursor.fetchone()[0] == 0:
        mock_data = [
            ("UP 16 DL 8731", "Aarav Sharma", "aarav.sharma@email.com", "+91 98765 43210", "Maruti Suzuki Swift", "2021-04-12", "2027-04-11"),
            ("MH 12 NE 9012", "Priya Patel", "priya.patel@email.com", "+91 91234 56789", "Honda Activa 5G", "2022-09-18", "2028-09-17"),
            ("DL 3C AQ 1234", "Vikram Singh", "vikram.singh@email.com", "+91 99887 76655", "Hyundai i20", "2020-11-05", "2026-11-04"),
            ("KA 03 MM 5678", "Ananya Rao", "ananya.rao@email.com", "+91 93456 78901", "KTM Duke 390", "2023-01-22", "2029-01-21"),
            ("HR 26 BY 4455", "Rohan Mehta", "rohan.mehta@email.com", "+91 94567 89012", "Toyota Fortuner", "2019-06-30", "2025-06-29"),
            ("NOT DETECTED", "Unknown Owner", "N/A", "N/A", "Unknown Vehicle", "N/A", "N/A")
        ]
        cursor.executemany("""
            INSERT OR IGNORE INTO rto_registry (
                license_plate, owner_name, owner_email, owner_phone, 
                vehicle_model, registration_date, insurance_valid_until
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, mock_data)
        
    conn.commit()
    conn.close()

