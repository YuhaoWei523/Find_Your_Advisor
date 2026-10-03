#!/usr/bin/env python3
"""
Find Your Advisor - Academic PI Discovery & CRM Platform Backend
Zero third-party pip dependencies required. Built with Python standard library.
Serves static frontend assets and provides SQLite REST API.
"""

import os
import sys
import json
import sqlite3
import mimetypes
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

DB_PATH = os.environ.get('ADVISOR_DB', 'neuroai.db' if os.path.exists('neuroai.db') else 'advisor.db')
SEED_FILE = 'seed_universities.json'
SEED_PROGRAMS_FILE = 'seed_programs.json'

DEFAULT_METHODS = [
    'BCI', 'Brain Modeling', 'Electrophysiology', 'Genomics / Bioinformatics',
    'NeuroAI / Machine Learning', 'Neuroimaging', 'Neuromodulation',
    'Optical Imaging', 'SNN / Neuromorphic'
]

DEFAULT_DOMAINS = [
    'Attention', 'Auditory', 'Decision Making', 'Disease / Clinical',
    'Emotion / Social', 'Linguistic', 'Memory', 'Motor',
    'Sleep / Circadian', 'Visual'
]

DEFAULT_STATUSES = [
    'Uncontacted', 'Reading Papers', 'Drafting Email',
    'Contacted', 'Replied - Positive', 'Replied - Negative',
    'Interview', 'Offer', 'Rejected'
]

def init_database_if_needed():
    """Ensures database tables exist and seeds universities if empty."""
    conn = sqlite3.connect(DB_PATH)
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
    CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        university_id INTEGER,
        name TEXT NOT NULL,
        degree TEXT DEFAULT 'PhD',
        rating INTEGER DEFAULT 0,
        department TEXT,
        deadline TEXT,
        app_fee TEXT,
        gre_requirement TEXT,
        english_requirement TEXT,
        status TEXT DEFAULT 'Considering',
        portal_url TEXT,
        faculty_match TEXT,
        notes TEXT,
        toefl_det TEXT,
        requires_master TEXT,
        intl_student_stats TEXT,
        fee_waiver_info TEXT,
        letters_of_rec TEXT,
        discipline_tag TEXT,
        intl_waiver_type TEXT,
        intl_waiver_event TEXT,
        intl_waiver_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(university_id) REFERENCES universities(id) ON DELETE SET NULL
    )
    """)

    # Auto-migration: check if programs table has rating column
    cursor.execute("PRAGMA table_info(programs)")
    prog_cols = [row[1] for row in cursor.fetchall()]
    if 'rating' not in prog_cols:
        cursor.execute("ALTER TABLE programs ADD COLUMN rating INTEGER DEFAULT 0")

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

    # Seed universities if empty
    cursor.execute("SELECT COUNT(*) FROM universities")
    if cursor.fetchone()[0] == 0 and os.path.exists(SEED_FILE):
        try:
            with open(SEED_FILE, 'r', encoding='utf-8') as f:
                unis = json.load(f)
                for u in unis:
                    cursor.execute("""
                    INSERT OR IGNORE INTO universities (id, name, country, lat, lon)
                    VALUES (?, ?, ?, ?, ?)
                    """, (u.get('id'), u.get('name'), u.get('country', 'USA'), u.get('lat'), u.get('lon')))
            conn.commit()
            print(f"[+] Seeded {len(unis)} universities into empty database.")
        except Exception as e:
            print(f"[!] Warning: Failed to seed universities: {e}")

    # Seed initial programs if empty
    cursor.execute("SELECT COUNT(*) FROM programs")
    if cursor.fetchone()[0] == 0 and os.path.exists(SEED_PROGRAMS_FILE):
        try:
            cursor.execute("SELECT id, name FROM universities")
            uni_map = {row[1].lower().strip(): row[0] for row in cursor.fetchall()}
            for k in list(uni_map.keys()):
                uni_map[k.split('(')[0].strip()] = uni_map[k]

            with open(SEED_PROGRAMS_FILE, 'r', encoding='utf-8') as f:
                progs = json.load(f)
                seeded_p = 0
                for p in progs:
                    uname = p.get('university_name', '').strip()
                    uid = uni_map.get(uname.lower()) or uni_map.get(uname.split('(')[0].strip().lower())
                    if not uid:
                        for uk in uni_map:
                            if uname.lower() in uk or uk in uname.lower():
                                uid = uni_map[uk]
                                break
                    if uid:
                        cursor.execute("""
                        INSERT INTO programs (
                            university_id, name, degree, rating, department, discipline_tag,
                            intl_waiver_type, intl_waiver_event, intl_waiver_link,
                            deadline, app_fee, gre_requirement, english_requirement,
                            toefl_det, requires_master, letters_of_rec, fee_waiver_info,
                            intl_student_stats, status, portal_url, faculty_match, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            uid, p.get('name'), p.get('degree', 'PhD'), p.get('rating', 0), p.get('department'),
                            p.get('discipline_tag', ''), p.get('intl_waiver_type', 'Standard Paid (Domestic Waivers Only)'),
                            p.get('intl_waiver_event', ''), p.get('intl_waiver_link', ''),
                            p.get('deadline'), p.get('app_fee'), p.get('gre_requirement', 'Not Required'),
                            p.get('english_requirement', ''), p.get('toefl_det', ''),
                            p.get('requires_master', "No (Bachelor's eligible)"),
                            p.get('letters_of_rec', '3 letters required'), p.get('fee_waiver_info', ''),
                            p.get('intl_student_stats', ''), p.get('status', 'Considering'),
                            p.get('portal_url', ''), p.get('faculty_match', ''), p.get('notes', '')
                        ))
                        seeded_p += 1
            conn.commit()
            print(f"[+] Seeded {seeded_p} sample academic programs into empty database.")
        except Exception as e:
            print(f"[!] Warning: Failed to seed programs: {e}")

    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class RequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for cross-origin or local file usage
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # API Routes
        if path == '/api/tags':
            self.handle_get_tags()
        elif path == '/api/researchers':
            self.handle_get_researchers(parsed_path.query)
        elif path == '/api/universities':
            self.handle_get_universities()
        elif path == '/api/logs':
            self.handle_get_logs()
        elif path == '/api/researchers/history':
            self.handle_get_researcher_history(parsed_path.query)
        elif path == '/api/programs':
            self.handle_get_programs(parsed_path.query)
        else:
            # Static File Serving
            self.handle_static_file(path)

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        if path == '/api/researchers/update':
            self.handle_update_researcher()
        elif path == '/api/researchers/add':
            self.handle_add_researcher()
        elif path == '/api/researchers/delete':
            self.handle_delete_researcher()
        elif path == '/api/universities/add':
            self.handle_add_university()
        elif path == '/api/universities/update':
            self.handle_update_university()
        elif path == '/api/universities/delete':
            self.handle_delete_university()
        elif path == '/api/logs/save':
            self.handle_save_log()
        elif path == '/api/logs/delete':
            self.handle_delete_log()
        elif path == '/api/programs/add':
            self.handle_add_program()
        elif path == '/api/programs/update':
            self.handle_update_program()
        elif path == '/api/programs/batch-update-difficulty':
            self.handle_batch_update_difficulty()
        elif path == '/api/programs/delete':
            self.handle_delete_program()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_static_file(self, path):
        # Default index and programs route
        if path in ('/', ''):
            path = '/index.html'
        elif path in ('/programs', '/program'):
            path = '/programs.html'
            
        safe_rel_path = path.lstrip('/')
        # Prevent directory traversal
        base_dir = os.path.abspath(os.path.dirname(__file__))
        target_path = os.path.abspath(os.path.join(base_dir, safe_rel_path))
        
        if not target_path.startswith(base_dir) or not os.path.exists(target_path) or os.path.isdir(target_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        mime_type, _ = mimetypes.guess_type(target_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        try:
            with open(target_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()

    def handle_get_universities(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.name, u.country, u.lat, u.lon, COUNT(r.id) as researcher_count
            FROM universities u
            LEFT JOIN researchers r ON u.id = r.university_id
            GROUP BY u.id
            ORDER BY u.name
        """)
        rows = cursor.fetchall()
        result = [
            {
                'id': r['id'],
                'name': r['name'],
                'country': r['country'] or 'Other',
                'lat': r['lat'],
                'lon': r['lon'],
                'researcher_count': r['researcher_count']
            }
            for r in rows
        ]
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

    def handle_get_tags(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT Methods_Tags, Domains_Tags FROM researchers")
        rows = cursor.fetchall()
        
        methods = set()
        domains = set()
        
        for r in rows:
            m_tags = [t.strip() for t in str(r['Methods_Tags']).split(',') if t.strip() and t.strip() != 'None']
            d_tags = [t.strip() for t in str(r['Domains_Tags']).split(',') if t.strip() and t.strip() != 'None']
            methods.update(m_tags)
            domains.update(d_tags)
            
        if not methods and DEFAULT_METHODS:
            methods = set(DEFAULT_METHODS)
        if not domains and DEFAULT_DOMAINS:
            domains = set(DEFAULT_DOMAINS)
            
        cursor.execute("SELECT name, country FROM universities ORDER BY country, name")
        
        # Group universities by country
        unis_by_country = {}
        for r in cursor.fetchall():
            c = r['country'] or 'Other'
            if c not in unis_by_country:
                unis_by_country[c] = []
            unis_by_country[c].append(r['name'])
            
        conn.close()
        
        data = {
            'methods': sorted(list(methods)),
            'domains': sorted(list(domains)),
            'universities': unis_by_country,
            'statuses': DEFAULT_STATUSES
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def handle_get_researchers(self, query_string):
        query_params = urllib.parse.parse_qs(query_string, keep_blank_values=True)
        
        search = query_params.get('search', [''])[0].lower()
        methods = query_params.get('methods[]', [])
        domains = query_params.get('domains[]', [])
        universities = query_params.get('universities[]', [])
        statuses = query_params.get('statuses[]', [])
        priorities = query_params.get('priorities[]', [])
        new_pi = query_params.get('new_pi', ['false'])[0] == 'true'
        incoming_pi = query_params.get('incoming_pi', ['false'])[0] == 'true'
        methods_logic = query_params.get('methods_logic', ['OR'])[0]
        domains_logic = query_params.get('domains_logic', ['OR'])[0]
        
        conn = get_db_connection()
        query = """
            SELECT r.*, u.name as uni_name, u.lat as uni_lat, u.lon as uni_lon 
            FROM researchers r 
            LEFT JOIN universities u ON r.university_id = u.id 
            WHERE 1=1
        """
        params = []
        
        if search:
            query += " AND (LOWER(r.Name) LIKE ? OR LOWER(r.Subject) LIKE ? OR LOWER(r.Department) LIKE ? OR LOWER(r.Other) LIKE ?)"
            wildcard_search = f"%{search}%"
            params.extend([wildcard_search] * 4)
            
        if universities:
            placeholders = ','.join(['?'] * len(universities))
            query += f" AND (u.name IN ({placeholders}))"
            params.extend(universities)
            
        if statuses:
            placeholders = ','.join(['?'] * len(statuses))
            query += f" AND (r.Application_Status IN ({placeholders}))"
            params.extend(statuses)

        if priorities:
            placeholders = ','.join(['?'] * len(priorities))
            query += f" AND (r.Priority IN ({placeholders}))"
            params.extend(priorities)

        if new_pi and incoming_pi:
            query += " AND (r.Start_Time LIKE '%2025%' OR r.Start_Time LIKE '%2026%' OR r.Start_Time LIKE '%2027%')"
        elif new_pi:
            query += " AND (r.Start_Time LIKE '%2025%' OR r.Start_Time LIKE '%2026%')"
        elif incoming_pi:
            query += " AND r.Start_Time LIKE '%2027%'"
            
        if methods:
            if methods_logic == 'AND':
                for m in methods:
                    query += " AND r.Methods_Tags LIKE ?"
                    params.append(f"%{m}%")
            else:
                query += " AND (" + " OR ".join(["r.Methods_Tags LIKE ?"] * len(methods)) + ")"
                params.extend([f"%{m}%" for m in methods])
                
        if domains:
            if domains_logic == 'AND':
                for d in domains:
                    query += " AND r.Domains_Tags LIKE ?"
                    params.append(f"%{d}%")
            else:
                query += " AND (" + " OR ".join(["r.Domains_Tags LIKE ?"] * len(domains)) + ")"
                params.extend([f"%{d}%" for d in domains])
                
        query += " ORDER BY r.id DESC"
                
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            d = dict(r)
            d['University'] = d['uni_name'] or d['University']
            d['Lat'] = d['uni_lat'] or d['Lat']
            d['Lon'] = d['uni_lon'] or d['Lon']
            d['Start Time'] = d['Start_Time']
            d['H-index'] = d['H_index']
            d['Application_Status'] = d['Application_Status'] or 'Uncontacted'
            d['User_Notes'] = d['User_Notes'] or ''
            d['Priority'] = d['Priority'] or 0
            d['Source'] = d['Source'] or 'Agent'
            result.append(d)
            
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

    def handle_update_researcher(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        r_id = data.get('id')
        if not r_id:
            self.send_response(400)
            self.end_headers()
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        allowed_fields = [
            'Application_Status', 'User_Notes', 'Priority',
            'Name', 'university_id', 'Department', 'Title', 'Subject', 
            'Web', 'H_index', 'Start_Time', 'Methods_Tags', 'Domains_Tags', 'Source'
        ]
        updates = []
        params = []
        
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = ?")
                params.append(data[field])
                
        if updates:
            query = f"UPDATE researchers SET {', '.join(updates)} WHERE id = ?"
            params.append(r_id)
            cursor.execute(query, params)
            conn.commit()
            
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

    def handle_add_researcher(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        allowed_fields = [
            'Name', 'university_id', 'Department', 'Title', 'Subject', 
            'Web', 'H_index', 'Start_Time', 'Methods_Tags', 'Domains_Tags', 'Source'
        ]
        columns = []
        placeholders = []
        params = []
        
        for field in allowed_fields:
            if field in data:
                columns.append(field)
                placeholders.append('?')
                params.append(data[field])
                
        if not columns:
            self.send_response(400)
            self.end_headers()
            conn.close()
            return
            
        query = f"INSERT INTO researchers ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(query, params)
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'id': new_id}).encode('utf-8'))

    def handle_delete_researcher(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        r_id = data.get('id')
        if not r_id:
            self.send_response(400)
            self.end_headers()
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM researchers WHERE id = ?", (r_id,))
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

    def handle_add_university(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        name = (data.get('name') or '').strip()
        country = (data.get('country') or 'USA').strip()
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not name:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'University name is required'}).encode('utf-8'))
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM universities WHERE LOWER(name) = ?", (name.lower(),))
        if cursor.fetchone():
            conn.close()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'An institution with this name already exists'}).encode('utf-8'))
            return

        cursor.execute(
            "INSERT INTO universities (name, country, lat, lon) VALUES (?, ?, ?, ?)",
            (name, country, float(lat) if lat not in (None, '') else None, float(lon) if lon not in (None, '') else None)
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'id': new_id}).encode('utf-8'))

    def handle_update_university(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        u_id = data.get('id')
        name = (data.get('name') or '').strip()
        country = (data.get('country') or 'USA').strip()
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not u_id or not name:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'ID and Name are required'}).encode('utf-8'))
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM universities WHERE LOWER(name) = ? AND id != ?", (name.lower(), u_id))
        if cursor.fetchone():
            conn.close()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Another institution with this name already exists'}).encode('utf-8'))
            return
            
        parsed_lat = float(lat) if lat not in (None, '') else None
        parsed_lon = float(lon) if lon not in (None, '') else None
        
        cursor.execute(
            "UPDATE universities SET name = ?, country = ?, lat = ?, lon = ? WHERE id = ?",
            (name, country, parsed_lat, parsed_lon, u_id)
        )
        # Synchronize linked researchers
        cursor.execute(
            "UPDATE researchers SET University = ?, Lat = ?, Lon = ? WHERE university_id = ?",
            (name, parsed_lat, parsed_lon, u_id)
        )
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

    def handle_delete_university(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        u_id = data.get('id')
        if not u_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'University ID is required'}).encode('utf-8'))
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cascade = data.get('cascade_researchers', False)
        if cascade:
            cursor.execute("DELETE FROM researchers WHERE university_id = ?", (u_id,))
        else:
            cursor.execute("UPDATE researchers SET university_id = NULL WHERE university_id = ?", (u_id,))
            
        cursor.execute("DELETE FROM universities WHERE id = ?", (u_id,))
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'deleted_id': u_id}).encode('utf-8'))

    # ==========================================
    # --- Program Management Handlers ---
    # ==========================================
    def handle_get_programs(self, query_string=''):
        params = urllib.parse.parse_qs(query_string) if query_string else {}
        degree_filter = params.get('degree', [None])[0]
        uni_filter = params.get('university_id', [None])[0]
        status_filter = params.get('status', [None])[0]

        query = """
            SELECT 
                p.id, 
                p.university_id, 
                u.name as university_name, 
                u.country as university_country,
                u.lat as university_lat,
                u.lon as university_lon,
                p.name, 
                p.degree, 
                p.department, 
                p.deadline, 
                p.app_fee, 
                p.gre_requirement, 
                p.english_requirement, 
                p.status, 
                p.portal_url, 
                p.faculty_match, 
                p.notes, 
                p.toefl_det,
                p.requires_master,
                p.intl_student_stats,
                p.fee_waiver_info,
                p.letters_of_rec,
                p.discipline_tag,
                p.intl_waiver_type,
                p.intl_waiver_event,
                p.intl_waiver_link,
                p.rating,
                p.difficulty,
                p.created_at,
                (SELECT COUNT(*) FROM researchers r WHERE r.university_id = p.university_id) as affiliated_pi_count
            FROM programs p
            LEFT JOIN universities u ON p.university_id = u.id
            WHERE 1=1
        """
        sql_params = []
        if degree_filter and degree_filter != 'All':
            query += " AND p.degree = ?"
            sql_params.append(degree_filter)
        if uni_filter:
            query += " AND p.university_id = ?"
            sql_params.append(int(uni_filter))
        if status_filter and status_filter != 'All':
            query += " AND p.status = ?"
            sql_params.append(status_filter)

        rating_filter = params.get('rating', [None])[0]
        if rating_filter:
            if rating_filter == 'unrated':
                query += " AND (p.rating IS NULL OR p.rating = 0)"
            elif rating_filter.isdigit():
                query += " AND p.rating = ?"
                sql_params.append(int(rating_filter))
            elif rating_filter in ('4', '4+'):
                query += " AND p.rating >= 4"
            elif rating_filter in ('3', '3+'):
                query += " AND p.rating >= 3"

        diff_filter = params.get('difficulty', [None])[0] or params.get('tier', [None])[0]
        if diff_filter and diff_filter != 'All':
            if diff_filter.lower() == 'unassigned':
                query += " AND (p.difficulty IS NULL OR p.difficulty = '')"
            else:
                query += " AND LOWER(p.difficulty) = ?"
                sql_params.append(diff_filter.lower())

        uni_param = params.get('uni', [None])[0] or params.get('institute', [None])[0]
        if uni_param:
            query += " AND (LOWER(u.name) LIKE ? OR LOWER(p.name) LIKE ?)"
            sql_params.extend([f"%{uni_param.lower()}%", f"%{uni_param.lower()}%"])

        discipline_filter = params.get('discipline', [None])[0]
        if discipline_filter and discipline_filter != 'All':
            query += " AND p.discipline_tag LIKE ?"
            sql_params.append(f"%{discipline_filter}%")

        waiver_filter = params.get('waiver', [None])[0]
        if waiver_filter and waiver_filter != 'All':
            query += " AND p.intl_waiver_type LIKE ?"
            sql_params.append(f"%{waiver_filter}%")

        query += """
            ORDER BY 
                CASE WHEN p.deadline IS NULL OR p.deadline = '' THEN 1 ELSE 0 END,
                p.deadline ASC,
                p.name ASC
        """

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, tuple(sql_params))
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

    def handle_add_program(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        name = (data.get('name') or '').strip()
        university_id = data.get('university_id')
        degree = (data.get('degree') or 'PhD').strip()
        rating = int(data.get('rating') or 0)
        department = (data.get('department') or '').strip()
        deadline = (data.get('deadline') or '').strip()
        app_fee = (data.get('app_fee') or '').strip()
        gre_requirement = (data.get('gre_requirement') or 'Not Required').strip()
        english_requirement = (data.get('english_requirement') or '').strip()
        status = (data.get('status') or 'Considering').strip()
        portal_url = (data.get('portal_url') or '').strip()
        faculty_match = (data.get('faculty_match') or '').strip()
        notes = (data.get('notes') or '').strip()
        toefl_det = (data.get('toefl_det') or '').strip()
        requires_master = (data.get('requires_master') or '').strip()
        intl_student_stats = (data.get('intl_student_stats') or '').strip()
        fee_waiver_info = (data.get('fee_waiver_info') or '').strip()
        letters_of_rec = (data.get('letters_of_rec') or '').strip()
        discipline_tag = (data.get('discipline_tag') or '').strip()
        intl_waiver_type = (data.get('intl_waiver_type') or '').strip()
        intl_waiver_event = (data.get('intl_waiver_event') or '').strip()
        intl_waiver_link = (data.get('intl_waiver_link') or '').strip()
        difficulty = (data.get('difficulty') or '').strip()
        
        if not name or not university_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Program name and University are required'}).encode('utf-8'))
            return

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO programs (
                university_id, name, degree, rating, difficulty, department, deadline, app_fee,
                gre_requirement, english_requirement, status, portal_url,
                faculty_match, notes, toefl_det, requires_master,
                intl_student_stats, fee_waiver_info, letters_of_rec,
                discipline_tag, intl_waiver_type, intl_waiver_event, intl_waiver_link
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            int(university_id), name, degree, rating, difficulty, department, deadline, app_fee,
            gre_requirement, english_requirement, status, portal_url,
            faculty_match, notes, toefl_det, requires_master,
            intl_student_stats, fee_waiver_info, letters_of_rec,
            discipline_tag, intl_waiver_type, intl_waiver_event, intl_waiver_link
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'id': new_id}).encode('utf-8'))

    def handle_update_program(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        p_id = data.get('id')
        if not p_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Program ID is required'}).encode('utf-8'))
            return

        allowed_fields = [
            'university_id', 'name', 'degree', 'department', 'deadline', 'app_fee',
            'gre_requirement', 'english_requirement', 'status', 'portal_url',
            'faculty_match', 'notes', 'toefl_det', 'requires_master',
            'intl_student_stats', 'fee_waiver_info', 'letters_of_rec',
            'discipline_tag', 'intl_waiver_type', 'intl_waiver_event', 'intl_waiver_link',
            'rating', 'difficulty'
        ]
        
        set_clauses = []
        params = []
        for field in allowed_fields:
            if field in data:
                val = data[field]
                if field in ('university_id', 'rating') and val is not None and val != '':
                    val = int(val)
                set_clauses.append(f"{field} = ?")
                params.append(val)
                
        if not set_clauses:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'No valid fields provided for update'}).encode('utf-8'))
            return
            
        params.append(int(p_id))
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE programs SET {', '.join(set_clauses)} WHERE id = ?", tuple(params))
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

    def handle_batch_update_difficulty(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        program_ids = data.get('program_ids', [])
        university_id = data.get('university_id')
        new_difficulty = (data.get('new_difficulty') if 'new_difficulty' in data else data.get('difficulty', '') or '').strip()
        old_difficulty = data.get('old_difficulty')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        updated_count = 0
        if program_ids:
            placeholders = ', '.join(['?'] * len(program_ids))
            cursor.execute(f"UPDATE programs SET difficulty = ? WHERE id IN ({placeholders})", [new_difficulty] + [int(pid) for pid in program_ids])
            updated_count = cursor.rowcount
        elif university_id:
            cursor.execute("UPDATE programs SET difficulty = ? WHERE university_id = ?", (new_difficulty, int(university_id)))
            updated_count = cursor.rowcount
        elif old_difficulty:
            cursor.execute("UPDATE programs SET difficulty = ? WHERE LOWER(difficulty) = LOWER(?)", (new_difficulty, old_difficulty.strip()))
            updated_count = cursor.rowcount
            
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'updated_count': updated_count, 'affected_rows': updated_count}).encode('utf-8'))

    def handle_delete_program(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        p_id = data.get('id')
        if not p_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Program ID is required'}).encode('utf-8'))
            return

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM programs WHERE id = ?", (int(p_id),))
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'deleted_id': p_id}).encode('utf-8'))

    def handle_get_logs(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM logs ORDER BY date DESC, id DESC")
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

    def handle_save_log(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        log_id = data.get('id')
        date = data.get('date')
        log_type = data.get('log_type')
        content_text = data.get('content')
        researcher_ids = data.get('researcher_ids', [])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if log_id:
            cursor.execute("UPDATE logs SET date=?, log_type=?, content=? WHERE id=?", (date, log_type, content_text, log_id))
        else:
            cursor.execute("INSERT INTO logs (date, log_type, content) VALUES (?, ?, ?)", (date, log_type, content_text))
            log_id = cursor.lastrowid
            
        cursor.execute("DELETE FROM log_researcher_links WHERE log_id=?", (log_id,))
        for r_id in researcher_ids:
            cursor.execute("INSERT INTO log_researcher_links (log_id, researcher_id) VALUES (?, ?)", (log_id, r_id))
            
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success', 'id': log_id}).encode('utf-8'))

    def handle_delete_log(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        log_id = data.get('id')
        if not log_id:
            self.send_response(400)
            self.end_headers()
            return
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM logs WHERE id = ?", (log_id,))
        conn.commit()
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

    def handle_get_researcher_history(self, query_string):
        query_params = urllib.parse.parse_qs(query_string, keep_blank_values=True)
        r_id = query_params.get('id', [None])[0]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT l.* FROM logs l
            JOIN log_researcher_links lrl ON l.id = lrl.log_id
            WHERE lrl.researcher_id = ?
            ORDER BY l.date DESC, l.id DESC
        """, (r_id,))
        rows = cursor.fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

if __name__ == '__main__':
    init_database_if_needed()
    port = int(os.environ.get('PORT', 5000))
    server = HTTPServer(('0.0.0.0', port), RequestHandler)
    print(f"======================================================")
    print(f" Find Your Advisor - Platform running on port {port}")
    print(f" Web UI: http://localhost:{port}")
    print(f" Zero external pip dependencies. Press Ctrl+C to stop.")
    print(f"======================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        server.server_close()
