# Universal AI Agent Guide for Academic Advisor Mining 🤖

> **Turn any modern AI agent (Claude Code, OpenAI Codex, Antigravity, Cursor, ChatGPT, Claude) into an autonomous academic advisor research assistant for ANY discipline and ANY university list.**

This guide provides instructions and ready-to-use prompt templates for both **Desktop / CLI Terminal Agents** and **Web Chat Assistants**.

---

## 📋 Table of Contents
- [Part 1: Desktop & CLI Terminal Agents](#part-1-desktop--cli-terminal-agents)
  - [1. Anthropic Claude Code (`claude` CLI)](#1-anthropic-claude-code-claude-cli)
  - [2. OpenAI Codex / Cursor / Windsurf / Cline](#2-openai-codex--cursor--windsurf--cline)
  - [3. Google Antigravity Desktop Agent](#3-google-antigravity-desktop-agent)
- [Part 2: Web Chat Assistants](#part-2-web-chat-assistants)
  - [4. Anthropic Claude (Claude.ai / Claude Projects)](#4-anthropic-claude-claudeai--claude-projects)
  - [5. OpenAI ChatGPT (GPT-4o / GPT-5 with Web Browsing)](#5-openai-chatgpt-gpt-4o--gpt-5-with-web-browsing)
- [Universal Researcher JSON Schema](#universal-researcher-json-schema)
- [Automated Ingestion into SQLite](#automated-ingestion-into-sqlite)

---

# Part 1: Desktop & CLI Terminal Agents

### 1. Anthropic Claude Code (`claude` CLI)
Claude Code operates directly within your terminal and workspace. This repository includes [`CLAUDE.md`](CLAUDE.md), enabling Claude Code to automatically recognize project architecture and runbooks.

#### How to Run:
Launch Claude Code in the project root:
```bash
claude
```
Then issue your mining prompt:
```text
Mine tenure-track faculty working on [YOUR TARGET DISCIPLINE, e.g. Quantum Computing & Quantum Information] across [TARGET UNIVERSITIES, e.g. MIT, Harvard, Princeton].
Search across all relevant departments (Physics, EE, CS, Quantum Institutes).
Extract Scholar metrics, lab websites, New PI lab start years (2024-2027), and recruiting notes.
Save each university to batches/{safe_uni_name}.json and run scripts/ingest.py to ingest into advisor.db.
```

---

### 2. OpenAI Codex / Cursor / Windsurf / Cline
For AI coding assistants running inside VS Code, Cursor, Windsurf, or terminal wrappers:
This repository includes [`.cursorrules`](.cursorrules) to guide the agent automatically.

#### Agent Task Prompt:
```markdown
Task: Mine academic advisors for {YOUR_DISCIPLINE} across target universities.

User Input:
- Target Discipline: [e.g. Robotics & Embodied AI]
- Method Keywords: [e.g. Reinforcement Learning, Sim2Real, Motion Planning, Vision-Language-Action]
- Domain Keywords: [e.g. Manipulation, Bipedal Locomotion, Surgical Robotics]
- University List: Read from `uni_list.txt` (or custom list: [Uni 1, Uni 2, Uni 3...])

Execution Steps:
1. Divide universities into batches of 3-5 schools.
2. For each school, sweep home departments, sister departments, and specialized research centers.
3. Extract Assistant, Associate, and Full Professors. Retrieve Google Scholar "H-index (Citations)" and lab founding years.
4. Save batches to `batches/{safe_uni_name}.json` conforming to `.agents/skills/advisor-data-miner/references/schema.md`.
5. Run: `python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir batches/ --db advisor.db`
```

---

### 3. Google Antigravity Desktop Agent
Antigravity automatically discovers and executes the built-in skill located at [`.agents/skills/advisor-data-miner/SKILL.md`](.agents/skills/advisor-data-miner/SKILL.md).

#### How to Trigger in Antigravity:
Simply instruct the agent:
> *"Use the `advisor-data-miner` skill to research faculty working on [Your Target Discipline] across [Your Target Universities], and ingest the results into my database."*

The skill handles batch scheduling, rate-limit avoidance, Google Scholar extraction fallbacks, and deduplicated ingestion automatically.

---

# Part 2: Web Chat Assistants

### 4. Anthropic Claude (Claude.ai / Claude Projects)
Paste this into your **Claude Project Custom Instructions** or system message:

```text
You are an expert academic advisor discovery agent for prospective PhD and postdoc researchers.
The user will provide a TARGET DISCIPLINE, KEYWORDS, and TARGET UNIVERSITIES.

Search & Extraction Protocol:
1. Cross-Department Sweep: Search across ALL departments and interdisciplinary centers where this field is pursued.
2. Rank Filtering: Focus on tenure-track faculty (Assistant, Associate, Full Professors). Exclude lecturers, adjuncts, and staff.
3. Intelligence Extraction:
   - Full Name, University (canonical name), Department, Affiliated Institute
   - Academic Rank, Location (City, State, Country)
   - Research Description & core keywords
   - Official lab website URL or faculty page
   - Google Scholar metrics: "H-index (Citations)", e.g. "24 (3100)". If unavailable, use "Unknown".
   - Educational Background: Undergraduate, PhD, Postdoctoral training
   - Lab Start Year: Detect appointment / founding year (e.g. "2025", "2026"). Flag New PIs (2024-2027) with active student recruitment intent.
   - Active Openings / Notes: Check lab /join or /openings pages for PhD/postdoc recruiting notes.
   - Methods_Tags: 1-3 core technical methods, tools, or models (comma-separated).
   - Domains_Tags: 1-3 problem domains, application areas, or targets (comma-separated).

Always output the resulting data as a valid JSON array conforming to the Find Your Advisor schema.
```

#### User Query Template:
```text
Target Discipline: [Enter your field, e.g. Computational Biology & Single-Cell Genomics]
Keywords: [e.g. scRNA-seq, Spatial Transcriptomics, Deep Learning for Proteomics]
Target University: [Enter school, e.g. UC Berkeley]

Please find Assistant, Associate, and Full Professors working on these topics, extract their Scholar metrics, lab websites, New PI start years, and output as a JSON array.
```

---

### 5. OpenAI ChatGPT (GPT-4o / GPT-5 with Web Browsing)

#### ChatGPT Query Prompt:
```text
Target Discipline: [Enter your field, e.g. Natural Language Processing & Foundation Models]
Keywords: [e.g. Reasoning, Alignment, Mechanistic Interpretability, Multilingual NLP]
Target University: [Enter school, e.g. University of Washington]

Instructions:
1. Use web browsing to search across Computer Science, Information School, and Linguistics.
2. Find tenure-track faculty actively researching this field.
3. Search Google Scholar for each professor to find their "H-index (Citations)".
4. Check their personal lab website for lab founding year (highlight New PIs starting 2024–2027) and student recruitment calls.
5. Return a valid JSON code block matching the Find Your Advisor schema.
```

---

## Universal Researcher JSON Schema

```json
[
  {
    "University": "Carnegie Mellon University (CMU)",
    "Name": "Alex Rivera",
    "Institute": "Robotics Institute (RI)",
    "Department": "School of Computer Science",
    "Title": "Assistant Professor",
    "City": "Pittsburgh",
    "State": "PA",
    "Country": "USA",
    "Subject": "Reinforcement learning and tactile perception for dexterous manipulation",
    "Web": "https://riveralab.cmu.edu",
    "H-index": "19 (2400)",
    "Undergraduate School": "UC Berkeley",
    "Master": "MIT",
    "Phd": "Stanford University",
    "Postdoc": "CMU",
    "Research Experience": "Visuomotor policies, sim-to-real transfer, soft tactile sensors",
    "Start Time": "2025",
    "Other": "Looking for 2 PhD students for Fall 2026 / 2027",
    "Methods_Tags": "Reinforcement Learning, Sim2Real, Tactile Sensing",
    "Domains_Tags": "Robotic Manipulation, Dexterous Hands"
  }
]
```

---

## Automated Ingestion into SQLite

```bash
# Ingest an entire directory of mined JSON files into advisor.db
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir ./batches/ --db advisor.db

# Ingest a single JSON file
python .agents/skills/advisor-data-miner/scripts/ingest.py --file ./sample.json --db advisor.db
```

### Ingestion Engine Capabilities
- **Dynamic University Registration**: If an institution is not already in the database, it automatically creates a new university record and links coordinates.
- **Smart Deduplication**: Uses `(LOWER(Name), LOWER(University))` to merge new academic crawl data without ever overwriting your personal CRM ratings, application status, or notes.
- **Instant UI Refresh**: Run `python app.py` and open `http://localhost:5000` to immediately view your new faculty cards, filter by tags, and track your outreach journal!
