# CLAUDE.md — Instructions for Claude Code (CLI Terminal Agent)

This document provides project context, command cheat sheets, and agent runbook instructions for **Claude Code** (`claude` CLI terminal agent).

---

## 🎯 Project Overview
**Find Your Advisor** is a local-first, zero-dependency academic advisor discovery and application CRM platform.
- **Frontend**: Responsive single-page application (`index.html`, `web_assets/app.js`, `web_assets/logo.jpg`, Leaflet GIS map).
- **Backend**: Zero external pip dependencies. Built strictly on Python standard library (`app.py`, `init_db.py`, SQLite `advisor.db`).
- **Data Ingestion**: Multi-format JSON validator and deduplication engine (`.agents/skills/advisor-data-miner/scripts/ingest.py`).
- **Discipline-Agnostic**: Works with ANY academic discipline (Robotics, Quantum, NLP, Bioengineering, Economics, Neuroscience, etc.) specified by the user.

---

## 💻 Essential Commands

### 1. Run Backend Server & Web UI
```bash
python app.py
```
- Starts HTTP & REST API server on `http://localhost:5000`.
- Automatically initializes `advisor.db` and populates the 106 seed universities if the database does not exist.

### 2. Initialize or Reset Database Manually
```bash
python init_db.py
```

### 3. Ingest Mined Researcher JSON Batches
```bash
# Ingest an entire directory of mined JSON files
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir ./batches/ --db advisor.db

# Ingest a single JSON file
python .agents/skills/advisor-data-miner/scripts/ingest.py --file ./sample.json --db advisor.db
```

---

## 🤖 Claude Code Agent Runbook: Autonomous Advisor Mining

When the user asks Claude Code to mine faculty or advisors for a discipline (e.g. `claude "Mine faculty in Quantum Computing across MIT, Stanford, and Harvard"`):

### Step 1: Clarify Discipline Parameters
Identify:
- `TARGET_DISCIPLINE`: Core field (e.g. "Quantum Computing", "Robotics", "Bioengineering").
- `METHOD_KEYWORDS`: Core tools and methodologies.
- `DOMAIN_KEYWORDS`: Application areas and target systems.
- `TARGET_UNIVERSITIES`: List of universities from prompt or `uni_list.txt`.

### Step 2: Cross-Department Directory Sweeping
For each university:
1. Search across all home departments, sister departments, and specialized institutes (e.g. Quantum Institutes, AI Labs, Bio-X centers).
2. Filter for tenure-track faculty (`Assistant Professor`, `Associate Professor`, `Full Professor`, `Research Faculty`).
3. Search Google Scholar for `"[Name] [University]"` to extract `H-index (Citations)`.
4. Check lab websites for active recruitment calls (`/join`, `/openings`) and founding year (tag New PIs starting 2024-2027).
5. Extract educational history (Undergraduate, PhD, Postdoc).
6. Assign 1-3 `Methods_Tags` and 1-3 `Domains_Tags`.

### Step 3: Write JSON Output
Save each university's results to `batches/{safe_university_name}.json` conforming to the schema in `.agents/skills/advisor-data-miner/references/schema.md`.

### Step 4: Ingest and Verify
Run:
```bash
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir batches/ --db advisor.db
```
Verify that all records were inserted and deduplicated cleanly without modifying any private CRM notes.
