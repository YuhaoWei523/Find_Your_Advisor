---
name: advisor-data-miner
description: >-
  Universal autonomous multi-agent workflow for discovering, scraping, enriching, and indexing academic faculty (Principal Investigators / PIs) across ANY academic discipline and ANY list of universities. Use when conducting literature or advisor searches for PhD/Postdoc applications, mapping multidisciplinary departments, extracting Google Scholar metrics, detecting lab opening years (New PIs 2024-2027), and ingesting structured researcher profiles into SQLite.
---

# Universal Advisor Data Miner — Discipline-Agnostic Academic Discovery Workflow

This skill defines a generalizable, autonomous multi-agent workflow for identifying, researching, and indexing academic faculty (Principal Investigators / PIs) for graduate school and postdoctoral recruitment. 

It is designed to be **completely discipline-agnostic and institution-agnostic**: whether you are researching advisors in **Robotics, Quantum Computing, Computational Biology, NeuroAI, Macroeconomics, Materials Science, or Natural Language Processing**, this skill provides the step-by-step methodology to map multidisciplinary university structures, crawl faculty directories, extract deep bibliometric and biographical intelligence, detect newly launched labs (New PIs), and ingest deduplicated records into a local SQLite database for the **Find Your Advisor** CRM platform.

---

## 🏛️ Architectural Overview

Modern research is inherently cross-disciplinary. Frontier work rarely resides within a single traditional department. This skill uses a **Two-Tier Agent Hierarchy** to thoroughly search institutions without overwhelming rate limits:

```
                           +----------------------------------------+
                           |           User Request / Input         |
                           | - Target Discipline & Keywords         |
                           | - Target Universities (List or File)   |
                           +-------------------+--------------------+
                                               |
                                               v
                           +----------------------------------------+
                           |          Orchestrator Agent            |
                           | - Batch queue controller (3-5 unis)    |
                           | - Subagent lifecycle supervisor        |
                           +-------------------+--------------------+
                                               |
                  +----------------------------+----------------------------+
                  |                            |                            |
                  v                            v                            v
      +-----------------------+    +-----------------------+    +-----------------------+
      |  Worker Miner (Uni A) |    |  Worker Miner (Uni B) |    |  Worker Miner (Uni C) |
      | 1. Cross-dept mapping |    | 1. Cross-dept mapping |    | 1. Cross-dept mapping |
      | 2. Directory roster   |    | 2. Directory roster   |    | 2. Directory roster   |
      | 3. Scholar metrics    |    | 3. Scholar metrics    |    | 3. Scholar metrics    |
      | 4. New PI & openings  |    | 4. New PI & openings  |    | 4. New PI & openings  |
      | 5. Adaptive tagging   |    | 5. Adaptive tagging   |    | 5. Adaptive tagging   |
      +-----------+-----------+    +-----------+-----------+    +-----------+-----------+
                  |                            |                            |
                  v                            v                            v
            [uni_A.json]                 [uni_B.json]                 [uni_C.json]
                  +----------------------------+----------------------------+
                                               |
                                               v
                               +--------------------------------+
                               |    scripts/ingest.py Engine    |
                               | - Universal Schema Validation  |
                               | - Dynamic University & Geocode |
                               | - Deduplication (Name + Uni)   |
                               | - Preserves Private CRM Notes  |
                               +---------------+----------------+
                                               |
                                               v
                                       [ neuroai.db ]
```

---

## 🎯 Step 1: Input Parameterization (Discipline & School Input)

Before launching mining tasks, define the search configuration:

| Parameter | Description | Examples |
| :--- | :--- | :--- |
| `TARGET_DISCIPLINE` | Core research field. | `"Robotics & Embodied AI"`, `"Quantum Computing"`, `"NeuroAI"`, `"Macroeconomics"` |
| `METHOD_KEYWORDS` | Core technical methods & tools. | Robotics: `[Reinforcement Learning, Motion Planning, Sim2Real, Computer Vision]`<br>Quantum: `[Superconducting Qubits, Quantum Error Correction, Neutral Atoms]` |
| `DOMAIN_KEYWORDS` | Applications & problem areas. | Robotics: `[Manipulation, Bipedal Locomotion, Surgical Robotics]`<br>Quantum: `[Quantum Simulation, Quantum Cryptography, Quantum Algorithms]` |
| `TARGET_SCHOOLS` | List of target institutions. | Read from `uni_list.txt`, a custom text file, or inline prompt. |
| `ROLES_FILTER` | Academic ranks to target. | Default: `[Assistant Professor, Associate Professor, Full Professor, Research Faculty]`. Filter out adjuncts, lecturers, and staff. |
| `RECRUITMENT_WINDOW` | Target opening years. | High-priority New PIs: `2024`, `2025`, `2026`, `2027` (Incoming). |

---

## 🗺️ Step 2: Universal Cross-Department & Institute Mapping Strategy

To ensure high recall, the agent must not limit its search to a single obvious department. For ANY discipline, execute the following 3-level directory mapping:

### 1. Primary Home Department
Locate the traditional disciplinary anchor at the target university:
- *Computer Science / Electrical & Computer Engineering* (for AI, Algorithms, Systems, Hardware).
- *Mechanical / Aerospace / Biomedical Engineering* (for Robotics, Biomechanics, Devices).
- *Physics / Applied Physics / Materials Science* (for Quantum, Photonics, Nanotechnology).
- *Biological Sciences / Neuroscience / Genetics* (for Life Sciences, Systems Biology).
- *Economics / Finance / Public Policy* (for Social Sciences).

### 2. Sister & Adjacent Departments
Identify departments where faculty develop overlapping methodologies:
- Example: NLP & Machine Learning researchers frequently hold primary appointments in **Linguistics**, **Information Schools (iSchool)**, **Statistics**, or **Data Science Institutes**.
- Example: Robotics researchers often span **Computer Science**, **Mechanical Engineering**, and **Electrical Engineering**.
- Example: Computational Biology researchers span **Computer Science**, **Biomedical Engineering**, **Biostatistics**, and **Medical School Genetics**.

### 3. Interdisciplinary Research Institutes & Centers (Frontier Hubs)
Top worldwide universities concentrate multidisciplinary talent in dedicated research centers. The agent should execute a search to uncover institute pages:
```text
Query pattern:
site:<university_domain> ("institute" OR "center" OR "initiative") "<TARGET_DISCIPLINE_KEYWORD>"
```
*Examples of such hubs*:
- MIT: CSAIL, Media Lab, McGovern, Koch Institute
- Stanford: HAI (Human-Centered AI), Bio-X, Wu Tsai, Q-FARM (Quantum)
- UC Berkeley: BAIR (Berkeley AI Research), QB3, Redwood Center
- CMU: Robotics Institute (RI), Language Technologies Institute (LTI), MLD

---

## 🔎 Step 3: Faculty Roster Crawling & Relevance Filtering

Once department directories or institute people pages are reached:

1. **Locate Faculty Directory Pages**:
   - Query pattern: `site:<university_domain> <department_name> ("faculty" OR "people" OR "directory" OR "professors")`
2. **Filter by Rank**:
   - Select Tenured / Tenure-Track faculty:
     - **Assistant Professor** (crucial target: usually actively hiring with grant support).
     - **Associate Professor** (established lab, high throughput, mature projects).
     - **Full Professor / Chair Professor** (domain leaders, large groups).
   - Filter out: Lecturers, teaching-only professors, adjuncts, visiting scholars, postdocs, and administrative coordinators (unless specified).
3. **Filter by Topic Relevance**:
   - Match the professor's bio, lab keywords, and recent publications against `METHOD_KEYWORDS` and `DOMAIN_KEYWORDS`.
   - Exclude faculty whose work is outside the user's research scope.

---

## 🧬 Step 4: Deep Profile Enrichment & Scholar Intelligence

For each identified candidate, extract comprehensive intelligence across 4 dimensions:

### A. Google Scholar Bibliometrics
- Query: `"[Professor Full Name]" "[Target University]"` on Google Scholar.
- Extract:
  - Total Citations (`citedby`)
  - All-time `H-index`
  - Format: `"<h-index> (<total_citations>)"` (e.g., `"28 (3850)"`).
- **Rate-Limit & Anti-Bot Fallback**:
  - If Google Scholar returns a CAPTCHA or blocking response, **never stall the batch**. Set `"H-index": "Unknown"` and proceed immediately.

### B. Personal Lab Website & Active Openings
- Locate the official lab website (often distinct from the generic departmental profile).
- Inspect pages like `/join`, `/openings`, `/prospective-students`, `/contact`, or `/news`.
- Extract recruitment status notes into the `"Other"` field:
  - e.g., *"Actively seeking 2 PhD students for Fall 2026 in Embodied AI"*, *"Funded postdoc opening available"*, *"Please email with CV and research statement"*.

### C. Lab Launch Year & "New PI" Detection (新晋导师雷达)
- New Principal Investigators (within their first 1–3 years of appointment) are the highest-leverage targets for graduate applicants because they possess fresh startup funding, unallocated student lines, and direct hands-on mentoring bandwidth.
- **Detection signals**:
  - Department appointment announcement date.
  - Ph.D. completion year (typically 1–4 years prior for postdocs transitioning to faculty).
  - Explicit start date on CV / website (e.g., *"Joined the department in Fall 2025"*).
- **Classification**:
  - **New PI**: Lab established in **2024, 2025, or 2026** (`badge-new`).
  - **Incoming PI**: Appointment commencing in **2027 or later** (`badge-incoming`).

### D. Academic Pedigree & Lineage
- Extract educational milestones:
  - `Undergraduate School`, `Master`, `Phd` (degree institution + year), `Postdoc` (training lab + institution).
  - Helps applicants evaluate mentorship heritage, lab culture, and pedigree alignment.

---

## 🏷️ Step 5: Adaptive Multi-Tagging Protocol (自适应双轨打标)

Regardless of the target academic field, researchers must be categorized into two orthogonal tag sets:

```text
Methods_Tags: 1-3 core methodologies, algorithms, tools, or physical techniques.
Domains_Tags: 1-3 application systems, theoretical sub-domains, or biological/physical targets.
```

### Examples Across Diverse Fields

#### Example 1: Robotics & Autonomous Systems
- **Methods Tags**: `Reinforcement Learning`, `Motion Planning`, `Sim2Real`, `Optimal Control`, `Tactile Sensing`, `Computer Vision`
- **Domains Tags**: `Bipedal Locomotion`, `Robotic Manipulation`, `Aerial Robotics`, `Autonomous Driving`, `Surgical Robotics`

#### Example 2: Quantum Information Science & Technology
- **Methods Tags**: `Superconducting Circuits`, `Trapped Ions`, `Neutral Atoms`, `Photonic Quantum`, `Quantum Error Correction`, `Hamiltonian Simulation`
- **Domains Tags**: `Quantum Computing`, `Quantum Sensing`, `Quantum Cryptography`, `Quantum Many-Body Physics`

#### Example 3: Natural Language Processing & AI
- **Methods Tags**: `LLM / Foundation Models`, `RAG`, `RLHF / Alignment`, `Mechanistic Interpretability`, `Knowledge Graphs`
- **Domains Tags**: `Dialogue Systems`, `Reasoning`, `Code Generation`, `Multilingual NLP`, `Healthcare NLP`

#### Example 4: Computational Biology & Genetics
- **Methods Tags**: `Single-Cell RNA-seq`, `Spatial Transcriptomics`, `Deep Learning for Proteomics`, `Molecular Dynamics`, `CRISPR Screening`
- **Domains Tags**: `Cancer Biology`, `Immunology`, `Structural Biology`, `Neurodevelopment`, `Evolutionary Genomics`

---

## 🤖 Step 6: Multi-Agent Batch Orchestration Prompt

To execute this workflow automatically via subagents, use the following battle-tested prompt templates:

### Orchestrator Subagent Prompt
```markdown
You are an academic discovery orchestrator.
Target Discipline: {TARGET_DISCIPLINE}
Keywords: {METHOD_KEYWORDS}, {DOMAIN_KEYWORDS}

Task:
1. Read the list of target universities from `{INPUT_FILE}` (or target list).
2. Divide the universities into batches of 3 to 5 universities per batch.
3. For each batch:
   - Use `invoke_subagent` to launch 1 `data_miner` subagent per university concurrently.
   - Instruct each subagent to deeply sweep relevant departments, extract PI profiles, fetch Scholar metrics, and save results to `batches/{safe_uni_name}.json`.
   - Wait for all subagents in the batch to report completion before proceeding to the next batch.
4. When all batches are completed:
   - Run `python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir batches/ --db neuroai.db` to validate, geocode, deduplicate, and ingest all records into SQLite.
5. Report total universities and PIs indexed.
```

### Worker Miner Subagent Prompt
```markdown
You are an expert academic data miner.
Target University: {University Name}
Discipline: {TARGET_DISCIPLINE}
Keywords: {KEYWORDS}

Instructions:
1. Search across all relevant departments and multidisciplinary research institutes at {University Name}.
2. Find all tenure-track faculty (Assistant, Associate, Full Professors) working on {TARGET_DISCIPLINE}.
3. For each researcher, extract:
   - "Name": Full name
   - "University": "{University Name}" (Exact canonical name)
   - "Institute": Affiliated center / research institute
   - "Department": Primary academic department
   - "Title": Academic rank
   - "City", "State", "Country": Location details
   - "Subject": Research description & keywords
   - "Web": Personal lab website URL or faculty page
   - "H-index": Search Google Scholar for "[Name] [University]". Format: "H-index (Citations)". If rate-limited, use "Unknown".
   - "Undergraduate School", "Master", "Phd", "Postdoc": Educational history
   - "Research Experience": Summary of past research focus
   - "Start Time": Year lab was established (e.g., "2025", "2026")
   - "Other": Openings notes (e.g. "Looking for PhD students")
   - "Methods_Tags": Comma-separated method tags
   - "Domains_Tags": Comma-separated domain tags
4. Save the results as a clean JSON array to: `batches/{safe_uni_name}.json` using `write_to_file`.
```

---

## 📥 Step 7: Automated Ingestion & SQLite Deduplication

Once JSON batch files are generated:

```powershell
# Ingest all JSON files in batches/ into the target SQLite database
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir batches/ --db neuroai.db

# Or ingest a single file
python .agents/skills/advisor-data-miner/scripts/ingest.py --file my_mined_batch.json --db neuroai.db
```

### Ingestion Engine Capabilities
- **Schema Auto-Creation**: Creates all required tables (`universities`, `researchers`, `logs`, `log_researcher_links`) on the fly.
- **Dynamic University Registration**: If a university is encountered that is not in the database, it automatically registers it in the `universities` table and assigns a foreign key.
- **Geocoding Coordinate Inheritance**: Automatically populates `Lat` and `Lon` coordinates from the master university table for GIS mapping.
- **Non-Destructive Deduplication**: Deduplicates on `(LOWER(Name), LOWER(University))`. Updates academic fields from new crawls without ever overwriting personal CRM fields (`Application_Status`, `User_Notes`, `Priority`).

---

## 📊 Step 8: Quality Verification Checklist

Before wrapping up a data mining run:
1. **Quantity & Coverage**: Check total indexed PIs and distribution across departments:
   ```powershell
   python -c "import sqlite3; c=sqlite3.connect('neuroai.db').cursor(); print('Total:', c.execute('SELECT count(*) FROM researchers').fetchone()[0])"
   ```
2. **New PI Representation**: Verify that recent assistant professors (2024-2027) are properly tagged with `Start_Time`.
3. **Scholar Accuracy**: Ensure H-indices are populated or gracefully defaulted to `"Unknown"`.
4. **CRM Ready**: Run `python app.py` and open `http://localhost:5000` to review cards, filter by tags, and start tracking outreach.
