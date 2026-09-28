#!/usr/bin/env python3
"""
Find Your Advisor - Database Initialization Script
Initializes SQLite database schema and seeds 106 global university coordinates.
Zero third-party pip dependencies required.
"""

import os
import sys
import json
import sqlite3

DB_PATH = 'neuroai.db'
SEED_FILE = 'seed_universities.json'

def init_database(db_path: str = DB_PATH):
    print(f"[*] Initializing database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create Universities Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS universities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        country TEXT DEFAULT 'USA',
        lat REAL,
        lon REAL
    )
    """)

    # 2. Create Researchers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS researchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        University TEXT,
        Name TEXT NOT NULL,
        Institute TEXT,
        Department TEXT,
        Title TEXT,
        City TEXT,
        State TEXT,
        Subject TEXT,
        Web TEXT,
        H_index TEXT,
        Undergraduate_School TEXT,
        Master TEXT,
        Phd TEXT,
        Postdoc TEXT,
        Research_Experience TEXT,
        Start_Time TEXT,
        Other TEXT,
        Lat REAL,
        Lon REAL,
        Methods_Tags TEXT,
        Domains_Tags TEXT,
        Application_Status TEXT DEFAULT 'Uncontacted',
        User_Notes TEXT DEFAULT '',
        Priority INTEGER DEFAULT 0,
        university_id INTEGER REFERENCES universities(id),
        Source TEXT DEFAULT 'Agent'
    )
    """)

    # 3. Create Logs Table (Outreach Journal)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        log_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. Create Log-Researcher Links Table (Bi-directional mentions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS log_researcher_links (
        log_id INTEGER,
        researcher_id INTEGER,
        PRIMARY KEY (log_id, researcher_id),
        FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
        FOREIGN KEY (researcher_id) REFERENCES researchers(id) ON DELETE CASCADE
    )
    """)

    conn.commit()

    # 5. Populate Seed Universities if empty
    cursor.execute("SELECT COUNT(*) FROM universities")
    uni_count = cursor.fetchone()[0]
    
    if uni_count == 0 and os.path.exists(SEED_FILE):
        print(f"[*] Seeding universities from {SEED_FILE}...")
        try:
            with open(SEED_FILE, 'r', encoding='utf-8') as f:
                unis = json.load(f)
                for u in unis:
                    cursor.execute("""
                    INSERT OR IGNORE INTO universities (id, name, country, lat, lon)
                    VALUES (?, ?, ?, ?, ?)
                    """, (u.get('id'), u.get('name'), u.get('country', 'USA'), u.get('lat'), u.get('lon')))
            conn.commit()
            cursor.execute("SELECT COUNT(*) FROM universities")
            uni_count = cursor.fetchone()[0]
            print(f"[+] Successfully seeded {uni_count} universities.")
        except Exception as e:
            print(f"[!] Error reading seed file: {e}")
    else:
        print(f"[+] Universities table already has {uni_count} entries.")

    conn.close()
    print("[+] Database initialization complete.")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    init_database(target)
