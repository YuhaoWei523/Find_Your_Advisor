# Universal AI Agent Guide for Academic Advisor Mining 🤖

> **Turn any modern LLM (ChatGPT, Claude, Cursor, Windsurf, Cline, or custom agents) into an autonomous academic advisor research assistant.**

This guide provides ready-to-use prompt templates and runbooks to mine faculty data across **any academic field** and **any list of universities**, and ingest the structured results into the **Find Your Advisor** database.

---

## 📋 Table of Contents
1. [Recipe 1: Anthropic Claude (Claude 3.5 Sonnet / Projects)](#recipe-1-anthropic-claude)
2. [Recipe 2: OpenAI ChatGPT (GPT-4o / GPT-5 / Web Search)](#recipe-2-openai-chatgpt)
3. [Recipe 3: AI Coding Assistants (Cursor / Windsurf / Cline / Aider)](#recipe-3-ai-coding-assistants)
4. [Universal Researcher JSON Schema](#universal-researcher-json-schema)
5. [Automated Ingestion into SQLite](#automated-ingestion-into-sqlite)

---

## Recipe 1: Anthropic Claude

### Setup in Claude Projects or Direct Chat
Claude 3.5 Sonnet excels at deep document research, synthesis, and structured JSON output.

#### Custom Instructions / Project System Prompt
Paste the following into your Claude Project Custom Instructions or initial prompt:

```text
You are an expert academic advisor discovery agent for prospective PhD and postdoc researchers.
Your goal is to thoroughly research faculty (Principal Investigators / PIs) at target universities for a specified discipline.

Search Methodology:
1. Cross-Department Sweep: For the given university, search across ALL relevant departments (e.g. Computer Science, Engineering, Natural Sciences, Medicine, and interdisciplinary institutes).
2. Rank Filtering: Focus on tenure-track faculty (Assistant Professor, Associate Professor, Full Professor, Research Faculty). Exclude lecturers, adjuncts, and administrative staff.
3. Information Extraction:
   - Full Name, University (exact canonical name), Department, Affiliated Institute
   - Academic Rank / Title, City, State, Country
   - Research Description & core keywords
   - Official lab website or faculty profile URL
   - Google Scholar metrics: Search "[Name] [University]" to find H-index and total citations. Format as "H-index (Citations)" e.g. "24 (3100)". If unavailable, use "Unknown".
   - Educational Background: Undergraduate, Master's, PhD (institution + year), Postdoctoral training
   - Lab Start Year: Detect appointment / founding year (e.g. "2025", "2026"). Highlight New PIs (2024-2027) who have active recruiting intent.
   - Active Openings / Notes: Check lab /join or /openings pages for PhD/postdoc recruiting notes.
   - Methods Tags: 1-3 core technical methods, tools, or models (comma-separated).
   - Domains Tags: 1-3 problem domains, application areas, or targets (comma-separated).

Always output the resulting data as a valid, well-formed JSON array conforming to the Find Your Advisor schema.
```

#### Query Prompt Template for Claude
```text
Please research faculty working on [Target Discipline, e.g. Robotics & Embodied AI] at [University Name, e.g. Carnegie Mellon University].
Search across the Robotics Institute (RI), School of Computer Science (SCS), and Mechanical Engineering.
Find Assistant, Associate, and Full Professors working on this topic.
Extract their Scholar H-index, lab website, recruiting status, and educational background.
Output the result as a single JSON array of researcher objects.
```

---

## Recipe 2: OpenAI ChatGPT

### Using with GPT-4o with Web Browsing / Custom GPT

#### Custom GPT System Instructions
```text
You are an Academic Advisor Miner. Your role is to identify and extract structured profiles of professors and PIs for graduate applicants.

When the user specifies a discipline and a target university:
1. Use Web Search to locate the university's department faculty directories and interdisciplinary research centers.
2. Identify faculty actively publishing in the specified research domain.
3. Search Google Scholar or web profiles to extract the H-index and citation count: "H-index (Citations)".
4. Detect the year they established their lab. Identify New PIs (established 2024–2027) with startup funding.
5. Identify any active PhD / Postdoc student recruitment notices on their personal lab websites.
6. Categorize their work with Methods Tags and Domains Tags.
7. Return a clean, valid JSON code block containing the list of researcher objects.
```

#### Query Prompt Template for ChatGPT
```text
Target Discipline: [e.g. Quantum Computing & Quantum Information]
Target University: [e.g. University of Chicago]
Keywords: Superconducting qubits, trapped ions, quantum error correction, quantum algorithms

Instructions:
1. Search across the Department of Physics, Pritzker School of Molecular Engineering, and Department of Computer Science.
2. Find faculty (especially Assistant and Associate Professors) working on these topics.
3. Extract their name, department, lab website, Google Scholar H-index, lab start year, and education.
4. Output the results as a JSON array matching the Find Your Advisor format.
```

---

## Recipe 3: AI Coding Assistants (Cursor / Windsurf / Cline / Aider)

When working inside the `Find_Your_Advisor` codebase with autonomous coding agents:

### Agent Runbook Prompt
```markdown
Task: Mine advisor data for [Target Discipline] across target universities in `uni_list.txt`.

Instructions:
1. Read the list of target universities from `uni_list.txt`.
2. Process universities in batches of 3-5 schools to manage context and prevent rate limiting.
3. For each university:
   - Search the web for relevant faculty across all related departments and interdisciplinary centers.
   - Extract full researcher profiles according to `.agents/skills/advisor-data-miner/references/schema.md`.
   - Save the results for each university to a JSON file at `batches/{safe_uni_name}.json`.
4. Once all batches are saved:
   - Run `python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir batches/ --db neuroai.db`
   - Verify that all records are inserted and deduplicated.
5. Report completion with total PIs added.
```

---

## Universal Researcher JSON Schema

All AI agents should format their output as a JSON array of objects with the following keys:

```json
[
  {
    "University": "Stanford University",
    "Name": "Jane Doe",
    "Institute": "Stanford AI Lab (SAIL)",
    "Department": "Computer Science",
    "Title": "Assistant Professor",
    "City": "Stanford",
    "State": "CA",
    "Country": "USA",
    "Subject": "Foundation models for robotic manipulation and physical reasoning",
    "Web": "https://janedoelab.stanford.edu",
    "H-index": "22 (3100)",
    "Undergraduate School": "UC Berkeley",
    "Master": "MIT",
    "Phd": "CMU",
    "Postdoc": "Stanford University",
    "Research Experience": "Diffusion policies, sim-to-real transfer, tactile sensing",
    "Start Time": "2025",
    "Other": "Recruiting 2 PhD students for Fall 2026/2027",
    "Methods_Tags": "Reinforcement Learning, Diffusion Models, Sim2Real",
    "Domains_Tags": "Robotic Manipulation, Physical AI"
  }
]
```

---

## Automated Ingestion into SQLite

Once your AI agent (ChatGPT, Claude, or Cursor) generates JSON files:

```bash
# Ingest an entire directory of mined JSON files
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir ./batches/ --db neuroai.db

# Ingest a single JSON file
python .agents/skills/advisor-data-miner/scripts/ingest.py --file ./mined_stanford.json --db neuroai.db
```

### Ingestion Features
- **Dynamic University Registration**: If an institution is not already in the database, it automatically creates a new university record and links coordinates.
- **Smart Deduplication**: Uses `(LOWER(Name), LOWER(University))` to merge new academic crawl data without ever overwriting your personal CRM ratings, application status, or notes.
- **Instant UI Refresh**: Run `python app.py` and open `http://localhost:5000` to immediately view your new faculty cards, filter by tags, and track your outreach journal!
