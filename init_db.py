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

DB_PATH = os.environ.get('ADVISOR_DB', 'neuroai.db' if os.path.exists('neuroai.db') else 'advisor.db')
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

    # 5. Create Programs Table (Academic Programs & Applications)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        degree TEXT DEFAULT 'PhD',
        department TEXT,
        discipline_tag TEXT,
        intl_waiver_type TEXT DEFAULT 'Standard Paid (Domestic Waivers Only)',
        intl_waiver_event TEXT,
        intl_waiver_link TEXT,
        deadline TEXT,
        app_fee TEXT,
        gre_requirement TEXT DEFAULT 'Not Required',
        english_requirement TEXT,
        toefl_det TEXT,
        requires_master TEXT DEFAULT 'No (Bachelor''s eligible)',
        letters_of_rec TEXT DEFAULT '3 letters required',
        fee_waiver_info TEXT,
        intl_student_stats TEXT,
        status TEXT DEFAULT 'Considering',
        portal_url TEXT,
        faculty_match TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()

    # 6. Populate Seed Universities if empty
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

    # 7. Populate Seed Programs if empty
    cursor.execute("SELECT COUNT(*) FROM programs")
    prog_count = cursor.fetchone()[0]
    programs_seed_file = 'seed_programs.json'
    if prog_count == 0 and os.path.exists(programs_seed_file):
        print(f"[*] Seeding academic programs from {programs_seed_file}...")
        try:
            with open(programs_seed_file, 'r', encoding='utf-8') as f:
                progs = json.load(f)
                cursor.execute("SELECT id, name FROM universities")
                uni_rows = cursor.fetchall()
                uni_dict = {u[1].lower(): u[0] for u in uni_rows}
                for u_id, u_name in uni_rows:
                    uni_dict[u_name.split('(')[0].strip().lower()] = u_id
                
                inserted_progs = 0
                for p in progs:
                    u_target = p.get('university_name', '').strip().lower()
                    u_id = uni_dict.get(u_target) or uni_dict.get(u_target.split('(')[0].strip())
                    if not u_id:
                        for k in uni_dict:
                            if u_target in k or k in u_target:
                                u_id = uni_dict[k]
                                break
                    if not u_id:
                        continue

                    cursor.execute("""
                    INSERT INTO programs (
                        university_id, name, degree, department, discipline_tag,
                        intl_waiver_type, intl_waiver_event, intl_waiver_link,
                        deadline, app_fee, gre_requirement, english_requirement,
                        toefl_det, requires_master, letters_of_rec, fee_waiver_info,
                        intl_student_stats, status, portal_url, faculty_match, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        u_id, p.get('name'), p.get('degree', 'PhD'), p.get('department'),
                        p.get('discipline_tag', ''), p.get('intl_waiver_type', 'Standard Paid (Domestic Waivers Only)'),
                        p.get('intl_waiver_event', ''), p.get('intl_waiver_link', ''),
                        p.get('deadline'), p.get('app_fee'), p.get('gre_requirement', 'Not Required'),
                        p.get('english_requirement', ''), p.get('toefl_det', ''),
                        p.get('requires_master', "No (Bachelor's eligible)"),
                        p.get('letters_of_rec', '3 letters required'), p.get('fee_waiver_info', ''),
                        p.get('intl_student_stats', ''), p.get('status', 'Considering'),
                        p.get('portal_url', ''), p.get('faculty_match', ''), p.get('notes', '')
                    ))
                    inserted_progs += 1
                conn.commit()
                print(f"[+] Successfully seeded {inserted_progs} demonstration academic programs.")
        except Exception as e:
            print(f"[!] Error seeding programs: {e}")

    conn.close()
    print("[+] Database initialization complete.")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    init_database(target)
