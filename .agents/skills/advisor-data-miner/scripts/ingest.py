#!/usr/bin/env python3
"""
Advisor Data Miner - JSON to SQLite Ingestion Script
Parses crawled researcher JSON files, validates schema, resolves university
geocoordinates, deduplicates records, and commits them to the SQLite database.
"""

import os
import sys
import json
import sqlite3
import argparse
from typing import Dict, Any, List, Optional, Tuple

def get_db_connection(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_tables_if_needed(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS universities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        country TEXT DEFAULT 'USA',
        lat REAL,
        lon REAL
    )
    """)
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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        log_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
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

def load_university_map(conn: sqlite3.Connection) -> Dict[str, Tuple[int, str, Optional[float], Optional[float]]]:
    """Returns a lookup mapping lowercase university names and synonyms to (id, canonical_name, lat, lon)."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, lat, lon FROM universities")
    mapping = {}
    for row in cursor.fetchall():
        uid, name, lat, lon = row['id'], row['name'], row['lat'], row['lon']
        mapping[name.lower().strip()] = (uid, name, lat, lon)
        
        # Add basic aliases if bracketed acronym exists e.g. "Carnegie Mellon University (CMU)"
        if '(' in name and ')' in name:
            base = name.split('(')[0].strip().lower()
            acronym = name[name.find('(')+1:name.find(')')].strip().lower()
            mapping[base] = (uid, name, lat, lon)
            mapping[acronym] = (uid, name, lat, lon)
    return mapping

def clean_tag_list(val: Any) -> str:
    if not val:
        return ""
    if isinstance(val, list):
        tags = [str(t).strip() for t in val if str(t).strip()]
        return ", ".join(tags)
    return str(val).strip()

def ingest_item(cursor: sqlite3.Cursor, item: Dict[str, Any], uni_map: Dict[str, Any]) -> str:
    name = (item.get("Name") or item.get("name") or "").strip()
    if not name:
        return "skipped_empty_name"
    
    uni_name = (item.get("University") or item.get("university") or "").strip()
    norm_uni = uni_name.lower()
    
    uni_id = None
    uni_lat = item.get("Lat")
    uni_lon = item.get("Lon")
    
    if norm_uni in uni_map:
        mapped_id, canonical_name, m_lat, m_lon = uni_map[norm_uni]
        uni_id = mapped_id
        uni_name = canonical_name
        if uni_lat is None:
            uni_lat = m_lat
        if uni_lon is None:
            uni_lon = m_lon

    institute = item.get("Institute", "")
    department = item.get("Department", "")
    title = item.get("Title", "")
    city = item.get("City", "")
    state = item.get("State", "")
    subject = item.get("Subject") or item.get("Research_Area", "")
    web = item.get("Web") or item.get("Website") or item.get("Lab Web", "")
    h_index = str(item.get("H_index") or item.get("H-index") or "")
    ug = item.get("Undergraduate_School") or item.get("Undergraduate School", "")
    master = item.get("Master", "")
    phd = item.get("Phd") or item.get("PhD", "")
    postdoc = item.get("Postdoc", "")
    exp = item.get("Research_Experience") or item.get("Research Experience", "")
    start_time = str(item.get("Start_Time") or item.get("Start Time") or "")
    other = item.get("Other", "")
    methods_tags = clean_tag_list(item.get("Methods_Tags"))
    domains_tags = clean_tag_list(item.get("Domains_Tags"))
    source = item.get("Source", "Agent")

    # Check for existing researcher by name and university
    cursor.execute("""
        SELECT id, Application_Status, User_Notes, Priority 
        FROM researchers 
        WHERE LOWER(Name) = ? AND (LOWER(University) = ? OR university_id = ?)
    """, (name.lower(), norm_uni, uni_id))
    existing = cursor.fetchone()

    if existing:
        r_id = existing['id']
        cursor.execute("""
            UPDATE researchers SET
                Institute = COALESCE(NULLIF(?, ''), Institute),
                Department = COALESCE(NULLIF(?, ''), Department),
                Title = COALESCE(NULLIF(?, ''), Title),
                Subject = COALESCE(NULLIF(?, ''), Subject),
                Web = COALESCE(NULLIF(?, ''), Web),
                H_index = COALESCE(NULLIF(?, ''), H_index),
                Undergraduate_School = COALESCE(NULLIF(?, ''), Undergraduate_School),
                Master = COALESCE(NULLIF(?, ''), Master),
                Phd = COALESCE(NULLIF(?, ''), Phd),
                Postdoc = COALESCE(NULLIF(?, ''), Postdoc),
                Research_Experience = COALESCE(NULLIF(?, ''), Research_Experience),
                Start_Time = COALESCE(NULLIF(?, ''), Start_Time),
                Other = COALESCE(NULLIF(?, ''), Other),
                Methods_Tags = COALESCE(NULLIF(?, ''), Methods_Tags),
                Domains_Tags = COALESCE(NULLIF(?, ''), Domains_Tags),
                university_id = COALESCE(?, university_id),
                Lat = COALESCE(?, Lat),
                Lon = COALESCE(?, Lon)
            WHERE id = ?
        """, (institute, department, title, subject, web, h_index, ug, master, phd, postdoc, exp, start_time, other, methods_tags, domains_tags, uni_id, uni_lat, uni_lon, r_id))
        return "updated"
    else:
        cursor.execute("""
            INSERT INTO researchers (
                University, Name, Institute, Department, Title, City, State,
                Subject, Web, H_index, Undergraduate_School, Master, Phd,
                Postdoc, Research_Experience, Start_Time, Other, Lat, Lon,
                Methods_Tags, Domains_Tags, Application_Status, User_Notes,
                Priority, university_id, Source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Uncontacted', '', 0, ?, ?)
        """, (uni_name, name, institute, department, title, city, state,
              subject, web, h_index, ug, master, phd, postdoc, exp,
              start_time, other, uni_lat, uni_lon, methods_tags, domains_tags,
              uni_id, source))
        return "inserted"

def main():
    parser = argparse.ArgumentParser(description="Ingest advisor JSON files into SQLite database.")
    parser.add_argument("--db", default="neuroai.db", help="Path to SQLite database file.")
    parser.add_argument("--json-dir", help="Path to folder containing JSON batch files.")
    parser.add_argument("--file", help="Path to a single JSON batch file.")
    args = parser.parse_args()

    if not args.json_dir and not args.file:
        print("Error: Specify either --json-dir or --file.")
        sys.exit(1)

    conn = get_db_connection(args.db)
    init_tables_if_needed(conn)
    uni_map = load_university_map(conn)
    cursor = conn.cursor()

    files_to_process = []
    if args.file:
        files_to_process.append(args.file)
    if args.json_dir:
        for root, _, files in os.walk(args.json_dir):
            for f in sorted(files):
                if f.endswith(".json"):
                    files_to_process.append(os.path.join(root, f))

    print(f"[*] Processing {len(files_to_process)} JSON file(s) into database: {args.db}")

    total_inserted = 0
    total_updated = 0
    total_skipped = 0

    for fpath in files_to_process:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    data = [data]
                
                f_inserted = 0
                f_updated = 0
                for item in data:
                    res = ingest_item(cursor, item, uni_map)
                    if res == "inserted":
                        f_inserted += 1
                    elif res == "updated":
                        f_updated += 1
                    else:
                        total_skipped += 1
                
                total_inserted += f_inserted
                total_updated += f_updated
                print(f" -> {os.path.basename(fpath)}: +{f_inserted} inserted, ~{f_updated} updated.")
        except Exception as e:
            print(f"[!] Error processing {fpath}: {e}")

    conn.commit()
    conn.close()

    print("\n[+] Ingestion Completed:")
    print(f"    Total inserted: {total_inserted}")
    print(f"    Total updated:  {total_updated}")
    print(f"    Total skipped:  {total_skipped}")

if __name__ == "__main__":
    main()
