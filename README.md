# Find Your Advisor 🎓

> **An Autonomous Academic PI Discovery, Bibliometric Intelligence & Application CRM Platform**  
> *Empowering prospective PhD students and postdocs to discover research advisors, track lab openings, and manage application outreach pipelines.*

<p align="center">
  <img src="web_assets/logo.jpg" alt="Find Your Advisor Logo" width="160" style="border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.8+" /></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/Dependencies-Zero_Pip_Installs-10b981?style=for-the-badge" alt="Zero Dependencies" /></a>
  <a href="#gis-map-explorer"><img src="https://img.shields.io/badge/GIS_Map-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" /></a>
  <a href="#universal-ai-agent-mining-workflow"><img src="https://img.shields.io/badge/AI_Agent-GPT_•_Claude_•_Cursor-8B5CF6?style=for-the-badge&logo=openai&logoColor=white" alt="Universal AI Agent Workflow" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## 📖 English Introduction

Applying for PhD or postdoctoral positions across academia (**Robotics, Quantum Computing, NLP, Computational Biology, NeuroAI, Materials Science, Economics, etc.**) is notoriously challenging. Frontier research is scattered across fragmented departments—Computer Science, Engineering, Natural Sciences, Medicine, and specialized interdisciplinary institutes. Crucial recruitment intelligence—such as lab opening years (New PIs with fresh funding), Google Scholar metrics, personal impressions, and application progress—frequently gets lost in disjointed spreadsheets.

**Find Your Advisor** is a modern, local-first academic advisor discovery and application CRM platform. Designed to be **completely discipline-agnostic and institution-flexible**, it allows you to input any academic field and target university list. It pairs a high-performance web interface and GIS map explorer with an autonomous **Multi-Agent AI Mining Workflow** (compatible with ChatGPT, Claude, Cursor, Windsurf, and custom LLM agents) that automatically crawls multidisciplinary department directories, extracts faculty credentials and bibliometrics, and maintains a clean, deduplicated SQLite database on your local machine.

---

## 🇨🇳 中文简介

在学术界（如 **机器人与具身智能、量子计算、大语言模型与 NLP、计算生物学、神经科学/NeuroAI、新材料、经济金融等任意学科**）寻找博士导师或博后岗位往往面临巨大挑战。前沿研究分散在不同的学院、交叉学科研究所与附属中心中。导师实验室成立年份（拥有启动经费与招生指标的新 PI）、Google Scholar 引用与 H-index、邮件联系进度与套瓷日志经常散落在 Excel 与笔记软件中，难以系统复盘。

**Find Your Advisor** 是一款完全本地化、隐私友好且**不限学科、不限院校名单**的通用学术导师发现与申请 CRM 平台。它提供现代化的交互界面、ESRI 全球地理 GIS 地图探索和带 `@导师` 智能提及的双向套瓷日记，并完整内置了支持 **ChatGPT (GPT-4o/5)、Claude (3.5 Sonnet)、Cursor 及各类主流 LLM Agent** 的通用多智能体数据挖掘工作流，支持由用户自定义输入目标学科、研究关键词与院校清单，自主进行多学院深度穿透挖掘、自动化提取学者引用并建立结构化本地数据库。

---

## ✨ Key Features / 核心功能

### 1. 🔬 User-Specified Discipline & Adaptive Taxonomy (用户自定义学科与自适应多维筛选)
- **100% Discipline-Agnostic**: Works with ANY academic discipline you enter (**Robotics & Embodied AI, Quantum Information, LLMs & NLP, Computational Biology, Materials Science, Economics, Computational Neuroscience, etc.**).
- **Dynamic Filter Generation**: The platform dynamically discovers all `Methods_Tags` and `Domains_Tags` from your database and renders interactive filter pills on the fly.
- Flexible **AND / OR logic** toggle for complex multi-tag intersection queries.

### 2. 🚀 New PI & Incoming PI Radar (新晋 PI 招生雷达)
- Identifies newly established labs (**2025 / 2026**) with distinctive orange badges.
- Detects upcoming faculty recruited for **2027** (Incoming PIs) with high-visibility pink badges.
- Quickly targets faculty members with maximum recruitment intent and available startup funding.

### 3. 🗺️ Interactive GIS Map Explorer (全球大学分布地图)
- Powered by Leaflet & high-resolution ESRI topographic vector tiles.
- Pre-seeded with **106 top research universities** across North America, Europe, and Asia (and dynamically registers any new institution).
- Country quick-jump buttons and dynamic clustering.
- Interactive university badges with visual indicators for starred priority PIs (pulsing gold ring) and active outreach pipelines (emerald green).
- Direct bidirectional flying: click on any university in a card to instantly fly the camera to its campus marker on the globe.

### 4. 📋 Application Pipeline CRM & Outreach Journal (申请套瓷 CRM 与工作日记)
- **Outreach Pipeline Stages**: `Uncontacted`, `Reading Papers`, `Drafting Email`, `Contacted`, `Replied - Positive`, `Replied - Negative`, `Interview`, `Offer`, `Rejected`.
- **Priority Ratings**: 1 to 5 gold stars for ranking dream labs.
- **Outreach Journal**: Daily log, weekly review, and monthly report tracking.
- **Smart `@` Professor Mention Badges**: Type `@` in the journal to auto-suggest professors; creates interactive clickable pills that navigate directly to the professor's card and records bi-directional communication history.
- **Global Batch Management**: Clean top-bar selection for single-click card editing and deletion.

### 5. 🎓 Graduate Program & Admissions Intelligence Tracker (学位项目与申请全景管理)
- **Dedicated Program Workspace (`programs.html`)**: Track graduate degree programs (PhD, Master's, Postdoc, Fellowship) organized by institution, department, and deadline. Built-in clean architecture and reserved database schema for future Master's and dual-degree programs.
- **Deadline Radar & Countdown Alert**: Dynamic deadline tracker with urgent visual alerts for milestones within 7 and 30 days, plus indicators for upcoming vs. passed deadlines.
- **Comprehensive Admissions Requirements**:
  - **Language Thresholds & Subscores**: Detailed tracking for TOEFL iBT and Duolingo English Test (DET) with specific subscore cutoffs (e.g. speaking minimums).
  - **Prerequisite Degree Verification**: Explicitly tracks whether a Master's degree is required or whether applicants are eligible for direct admission with a Bachelor's.
  - **Letters of Recommendation**: Displays exact number of required recommendation letters (e.g. 2 or 3 letters).
  - **Application Fee & Fee Waiver Info Sessions**: Highlights application fees alongside clickable links to virtual info sessions and diversity waiver programs offering free application codes.
  - **Past International Student Admission Stats**: Records cohort sizes, international student acceptance rates, and 5-year full stipend/fellowship guarantees.
- **Dual Visual Modes**: Switch seamlessly between responsive **Card Grid View** (with quick 1-click status changers) and dense **Spreadsheet Table View**.
- **Advisor Cross-Linking**: Automatically counts affiliated faculty from your database for each institution, displays matched target advisors, and provides 1-click navigation to view professor profiles.
- **1-Click CSV Data Export**: Export all tracked programs with all admissions metrics to standard `.csv` for offline backup or sharing.

### 6. 🏛️ Institution & University Management (院校与机构管理)
- **Full CRUD Support**: Add new institutions, edit existing universities, or remove institutions directly from the UI.
- **Auto-Geocoding**: Built-in OpenStreetMap Nominatim coordinate auto-detector (`🌐 Auto-Detect`) instantly finds latitude and longitude for any campus without manual coordinate lookup.
- **Affiliated Researcher Synchronization**: Renaming an institution or updating its coordinates automatically synchronizes all linked faculty cards and map markers in real-time.
- **Safe Deletion Guard**: Deleting an institution safely unlinks affiliated researcher profiles (clears university field while preserving all profile data, contact records, and notes).

### 7. ⚡ Zero-Dependency Lightweight Architecture (零依赖架构)
- **Vanilla Python Standard Library**: Built strictly using `http.server`, `sqlite3`, `urllib`, and `json`.
- **Zero pip install required**: No Node.js, no Docker, no external database servers. Runs out of the box on Windows, macOS, and Linux.

### 8. 🔒 100% Privacy & Local-First (数据私密性保证)
- Your contact history, personal ratings, and notes are stored strictly in a local SQLite file (`advisor.db` or legacy `neuroai.db`).
- Nothing is uploaded to third-party clouds or telemetry servers.

---

## 🚀 Quick Start / 快速开始 (30 Seconds)

### Prerequisites
- Python 3.8 or higher.
- A modern web browser (Chrome, Edge, Firefox, Safari).

### 1. Clone the Repository
```bash
git clone https://github.com/YuhaoWei523/Find_Your_Advisor.git
cd Find_Your_Advisor
```

### 2. Start the Server
```bash
python app.py
```

*Note: On the first run, `app.py` automatically initializes `advisor.db` (or connects to your existing database) and populates the 106 global research universities and their geographic coordinates.*

### 3. Open in Browser
Visit:
```
http://localhost:5000
```
or open `index.html` directly in your browser.

---

## 🤖 Universal AI Agent Mining Workflow (Claude Code • Codex • Antigravity • Cursor • ChatGPT)

The repository provides a complete, model-agnostic academic discovery framework in [`.agents/skills/advisor-data-miner/`](.agents/skills/advisor-data-miner/SKILL.md) and ready-to-copy prompt recipes in [`AI_AGENT_GUIDE.md`](AI_AGENT_GUIDE.md).

```
Find_Your_Advisor/
├── CLAUDE.md                 # Configuration and runbook for Claude Code CLI agent
├── .cursorrules              # Rules & guidelines for Cursor, Windsurf, & Codex agents
├── AI_AGENT_GUIDE.md         # Ready-to-copy prompts for Claude, ChatGPT, Codex & Antigravity
└── .agents/skills/advisor-data-miner/
    ├── SKILL.md              # Universal agent instruction runbook
    ├── scripts/
    │   └── ingest.py         # Robust JSON to SQLite validation & ingestion engine
    ├── examples/
    │   └── sample_batch.json # Standardized JSON data format reference
    └── references/
        └── schema.md         # Full database schema and taxonomy reference
```

### How the Mining Workflow Works

```mermaid
flowchart TD
    A["Target Discipline & Research Keywords (User Defined)\n+ Target Universities (Custom List or uni_list.txt)"] --> B["Master Orchestrator / Agent Prompt"]
    B -->|"Batches of 3-5 universities"| C["AI Agent Miners\n(Claude Code / Codex / Antigravity / Cursor / ChatGPT)"]
    C -->|"Sweep User-Targeted Academic Departments & Institutes"| D["Faculty Directory Scraper & Lab Pages"]
    D -->|"Fetch metrics & citations (Google Scholar)"| E["Bibliometric & Lab Intelligence"]
    E -->|"Adaptive Multi-Tagging (Methods & Domains) & New PI Detection"| F["Structured JSON Batches (batches/*.json)"]
    F -->|"Universal Schema Ingestion & Deduplication"| G["scripts/ingest.py"]
    G --> H[("advisor.db (Local SQLite)")]
```

### 🎯 Fast Setup with Desktop & Chat AI Assistants

- **Anthropic Claude Code (`claude` CLI terminal agent)**:
  - This repo includes [`CLAUDE.md`](CLAUDE.md). Run `claude` in your terminal and ask:
    > *"Mine faculty working on [Your Target Field, e.g. Quantum Computing] across [Target Universities], save to batches/, and ingest into advisor.db."*
- **OpenAI Codex / Cursor / Windsurf / Cline**:
  - This repo includes [`.cursorrules`](.cursorrules). Point your coding assistant to `uni_list.txt` or a custom list and have it run the batch crawler and ingestion automatically.
- **Google Antigravity Desktop Agent**:
  - The repository's [`.agents/skills/advisor-data-miner/`](.agents/skills/advisor-data-miner/SKILL.md) is auto-discovered as an autonomous skill. Instruct your agent:
    > *"Use advisor-data-miner to research faculty in [Your Field] across [Universities] and update my database."*
- **Web Chat Assistants (Claude.ai / ChatGPT GPT-4o)**:
  - Copy ready-to-use prompt templates from [`AI_AGENT_GUIDE.md`](AI_AGENT_GUIDE.md) to generate structured researcher JSON directly.

### Automated Ingestion into SQLite
Whenever your AI agent generates researcher JSON files:
```bash
# Ingest an entire directory of JSON files
python .agents/skills/advisor-data-miner/scripts/ingest.py --json-dir ./batches/ --db advisor.db

# Ingest a single JSON file
python .agents/skills/advisor-data-miner/scripts/ingest.py --file ./sample.json --db advisor.db
```

The ingestion engine automatically:
1. Validates the JSON schema.
2. Dynamically registers any new universities into the database and inherits GIS coordinates.
3. Deduplicates on `(LOWER(Name), LOWER(University))`.
4. Merges newly scraped profile fields without altering your personal CRM ratings or outreach notes.

---

## 📂 Project Directory Structure

```text
Find_Your_Advisor/
├── index.html                   # Modern responsive frontend SPA
├── app.py                       # Zero-dependency Python HTTP & REST API server
├── init_db.py                   # Standalone database initialization script
├── seed_universities.json       # Geocoordinates & country data for 106 universities
├── uni_list.txt                 # Canonical list of target universities
├── CLAUDE.md                    # Agent instructions for Claude Code CLI
├── .cursorrules                 # Agent rules for Cursor, Windsurf, & Codex
├── AI_AGENT_GUIDE.md            # Ready-to-copy prompts for Claude, ChatGPT, Codex & Antigravity
├── .gitignore                   # Strict rules protecting personal database & notes
├── LICENSE                      # MIT Open Source License
├── README.md                    # Project documentation
├── web_assets/
│   ├── app.js                   # Application logic, Leaflet GIS, & mention system
│   └── logo.jpg                 # Brand logo
└── .agents/
    └── skills/
        └── advisor-data-miner/  # Universal data collection skill package
            ├── SKILL.md
            ├── scripts/ingest.py
            ├── examples/sample_batch.json
            └── references/schema.md
```

---

## 🛠️ API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/tags` | GET | Returns available methods, domains, countries, and universities. |
| `GET /api/researchers` | GET | Filter researchers by search keywords, methods, domains, universities, statuses, priorities, and PI status. |
| `GET /api/universities` | GET | Returns list of all universities with IDs. |
| `GET /api/logs` | GET | Returns outreach journal entries sorted by date. |
| `GET /api/researchers/history`| GET | Returns outreach log history specifically mentioning a given researcher ID. |
| `POST /api/researchers/update`| POST | Updates researcher fields (status, notes, priority, lab details). |
| `POST /api/researchers/add` | POST | Manually adds a new researcher profile. |
| `POST /api/researchers/delete`| POST | Deletes a researcher from the database. |
| `POST /api/logs/save` | POST | Creates or updates an outreach log entry and synchronizes `@` mentions. |
| `POST /api/logs/delete` | POST | Deletes an outreach log entry. |

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ for academic researchers and aspiring scholars worldwide.
</p>
