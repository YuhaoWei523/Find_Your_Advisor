---
name: advisor-data-miner
description: >-
  Autonomous multi-agent workflow for discovering, scraping, enriching, and indexing academic faculty (Principal Investigators / PIs) across global university departments. Use when searching for PhD/Postdoc advisors, crawling faculty directories across multidisciplinary departments, extracting Google Scholar bibliometrics, identifying lab opening years (New PIs 2025-2027), and ingesting structured researcher profiles into SQLite.
---

# Advisor Data Miner — Autonomous Multi-Agent Academic Mining Workflow

This skill documents the end-to-end, multi-agent workflow for collecting, enriching, and maintaining an academic researcher database. It orchestrates subagents across university faculty directories, extracts deep academic profiles (education, research keywords, lab websites, Scholar metrics, lab establishment years), classifies research into standardized taxonomies, and ingests deduplicated records into a local SQLite database for the **Find Your Advisor** CRM platform.

---

## Architecture Overview

```
                               +-----------------------------+
                               |     Orchestrator Agent      |
                               | (Batch controller, 3-5 unis)|
                               +--------------+--------------+
                                              |
                   +--------------------------+--------------------------+
                   |                          |                          |
                   v                          v                          v
       +-----------------------+  +-----------------------+  +-----------------------+
       |   Data Miner (Uni A)  |  |   Data Miner (Uni B)  |  |   Data Miner (Uni C)  |
       |  CS / BioE / Neuro /  |  |  CS / BioE / Neuro /  |  |  CS / BioE / Neuro /  |
       |     Psych / Med       |  |     Psych / Med       |  |     Psych / Med       |
       +-----------+-----------+  +-----------+-----------+  +-----------+-----------+
                   |                          |                          |
                   v                          v                          v
             [batch_A.json]             [batch_B.json]             [batch_C.json]
                   +--------------------------+--------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    scripts/ingest.py Engine   |
                              | - Schema Validation           |
                              | - Geocoding & Lat/Lon Map     |
                              | - Deduplication (Name + Uni)  |
                              | - SQLite Transaction Ingest   |
                              +---------------+---------------+
                                              |
                                              v
                                      [ neuroai.db ]
```

---

## Step 1: Target Definition & Target Universities

1. **Target Research Scope**:
   - Primary: Computational Neuroscience, AI for Neuroscience (NeuroAI), Brain-Computer Interfaces (BCI), Neuroengineering, Cognitive AI.
   - Secondary: Theoretical Neuroscience, Neuroimaging, Neuromorphic Computing, Electrophysiology, Biophysical Modeling.
2. **Target Departments to Sweep**:
   - Faculty members in these fields often hold primary or joint appointments across multiple departments. For each institution, sweep:
     - **Computer Science & AI / EECS** (Machine Learning, Vision, Neural Decoders).
     - **Biomedical Engineering / Bioengineering** (Neural Engineering, BCI, Neuro-implants).
     - **Neuroscience / Brain & Cognitive Sciences** (Systems & Computational Labs).
     - **Psychology / Cognitive Science** (Computational Cognitive Science).
     - **Specialized Institutes** (e.g., CSAIL, McGovern, Picower, Wu Tsai, Bio-X, Gatsby).
3. **University Target List**:
   - Maintain canonical list of target institutions in `uni_list.txt`.

---

## Step 2: Multi-Agent Batch Orchestration

To avoid search rate limits, IP blocking, and context window exhaustion, invoke subagents in **batches of 3 to 5 universities**.

### Orchestrator Prompt Template
```markdown
Read the university target list from `uni_list.txt`.
Group the universities into batches of 3-5.
For each batch:
1. Use `invoke_subagent` to spawn one `data_miner` subagent per university.
2. Direct each subagent to deeply sweep all relevant departments (CS, Bioengineering, Neuroscience, Psychology).
3. Have each subagent save their results as an atomic JSON array to `batches/<safe_uni_name>.json`.
4. Wait for all subagents in the batch to complete before proceeding to the next batch.
When all batches are finished, run `python scripts/ingest.py --json-dir batches/ --db neuroai.db` to ingest all records.
```

### Data Miner Worker Subagent Prompt Template
```markdown
Mine faculty/PI data for the following university: {University Name}

IMPORTANT INSTRUCTIONS:
1. Search all relevant department directories: Computer Science, Bioengineering, Neuroscience, Psychology, and affiliated institutes.
2. Identify all faculty (Assistant, Associate, Full Professors, Research Faculty) working on Computational Neuroscience, NeuroAI, BCI, Neuroimaging, or Brain Modeling.
3. For each researcher, extract:
   - "Name": Full name
   - "University": "{University Name}" (Exact canonical name)
   - "Institute": Affiliated research institute / center
   - "Department": Primary department
   - "Title": Academic rank (e.g. Assistant Professor, Associate Professor, Professor)
   - "City", "State": Campus location
   - "Subject": Research description & keywords
   - "Web": Lab or faculty profile URL
   - "H-index": Search Google Scholar for "[Name] [University]", format as "H-index (Citations)", e.g. "21 (1850)". If rate-limited, use "Unknown".
   - "Undergraduate School", "Master", "Phd", "Postdoc": Educational history
   - "Research Experience": Summary of past research topics
   - "Start Time": Year lab was established (e.g. "2025", "2026", "2021")
   - "Other": Recruiting notes (e.g. "Looking for PhD students", "Open Postdoc positions")
   - "Methods_Tags": Comma-separated tags from taxonomy
   - "Domains_Tags": Comma-separated tags from taxonomy
4. Save the results as a JSON array to: `batches/{safe_uni_name}.json`.
```

---

## Step 3: Google Scholar Bibliometrics Enrichment

1. Query: `"[Professor Name]" "[University Name]"` on Google Scholar.
2. Extract:
   - Author profile verified email / affiliation.
   - All-time `h-index`.
   - Total `citations`.
   - Format: `"<h-index> (<citations>)"` (e.g. `"24 (3100)"`).
3. **Resilience & Fallback**:
   - If Scholar prompts a CAPTCHA or blocks requests, do **not** abort. Record `"H-index": "Unknown"` and continue mining without blocking the batch.

---

## Step 4: Tag Classification & New PI Detection

Classify each researcher using standardized tags for the UI filters:

### Methods Taxonomy
`BCI`, `Brain Modeling`, `Electrophysiology`, `Genomics / Bioinformatics`, `NeuroAI / Machine Learning`, `Neuroimaging`, `Neuromodulation`, `Optical Imaging`, `SNN / Neuromorphic`

### Domains Taxonomy
`Attention`, `Auditory`, `Decision Making`, `Disease / Clinical`, `Emotion / Social`, `Linguistic`, `Memory`, `Motor`, `Sleep / Circadian`, `Visual`

### Lab Start Time & New PI Badges
- **New PI (2025/2026)**: If lab established in 2025 or 2026, set `"Start Time": "2025"` or `"2026"`. The UI displays a high-priority orange badge.
- **Incoming PI (2027)**: If recruited to open in 2027, set `"Start Time": "2027"`. The UI displays a pink incoming badge.

---

## Step 5: Ingestion, Geocoding, & Deduplication

Once JSON batch files are generated, execute the automated ingestion script:

```powershell
python scripts/ingest.py --json-dir batches/ --db neuroai.db
```

### Ingestion Features
1. **Schema Initialization**: Automatically creates tables (`universities`, `researchers`, `logs`, `log_researcher_links`) if they do not exist.
2. **University Linking & Geocoding**: Matches PI university against `universities` table and inherits canonical `lat`, `lon` coordinates.
3. **Smart Deduplication**:
   - Deduplicates on `(LOWER(Name), LOWER(University))`.
   - Updates existing records with newly mined profile fields without overwriting user-curated CRM fields (`Application_Status`, `User_Notes`, `Priority`).

---

## Step 6: Verification & Database Inspection

After ingestion, verify data integrity:

```powershell
# Check researcher counts and top universities
python -c "import sqlite3; c = sqlite3.connect('neuroai.db').cursor(); print('Total PIs:', c.execute('SELECT count(*) FROM researchers').fetchone()[0])"

# Start the web app to explore interactively
python app.py
```
Open `http://localhost:5000` to review the cards, GIS map clusters, and CRM logs.
