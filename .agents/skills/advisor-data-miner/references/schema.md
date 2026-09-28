# Advisor Data Miner — Schema & Taxonomy Reference

This document defines the data models, tagging taxonomy, and field definitions used across the **Advisor Data Miner** workflow and the **Find Your Advisor** database.

---

## 1. Database Entities & Tables

### Table: `researchers`
The primary table storing Principal Investigator (PI) profiles, academic credentials, and outreach CRM state.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique researcher ID (autoincrement). |
| `University` | TEXT | NULL | University name matching the institution. |
| `Name` | TEXT | NOT NULL | PI full name (e.g., "Jane Doe"). |
| `Institute` | TEXT | NULL | Research center or affiliated institute (e.g., "Wu Tsai Neurosciences Institute"). |
| `Department` | TEXT | NULL | Primary academic department (e.g., "Bioengineering", "Computer Science"). |
| `Title` | TEXT | NULL | Academic rank ("Assistant Professor", "Associate Professor", "Professor"). |
| `City` | TEXT | NULL | Campus city location. |
| `State` | TEXT | NULL | State, province, or region. |
| `Subject` | TEXT | NULL | Core research description and lab keywords. |
| `Web` | TEXT | NULL | Official lab website or department faculty webpage URL. |
| `H_index` | TEXT | NULL | Bibliometrics string: `"H-index (Total Citations)"`, e.g. `"24 (3100)"`. |
| `Undergraduate_School` | TEXT | NULL | Undergraduate alma mater. |
| `Master` | TEXT | NULL | Master's degree alma mater (if applicable). |
| `Phd` | TEXT | NULL | PhD alma mater and conferring institution. |
| `Postdoc` | TEXT | NULL | Postdoctoral training institution and mentors. |
| `Research_Experience` | TEXT | NULL | Summary of previous research focus and methodologies. |
| `Start_Time` | TEXT | NULL | Year the faculty member established their lab (e.g., `"2025"`, `"Fall 2026"`). |
| `Other` | TEXT | NULL | Openings notes, recruiting status (e.g., "Looking for 2 PhD students"). |
| `Lat` | REAL | NULL | Latitude coordinate of university campus (inherited or geocoded). |
| `Lon` | REAL | NULL | Longitude coordinate of university campus (inherited or geocoded). |
| `Methods_Tags` | TEXT | NULL | Comma-separated list of standardized method tags. |
| `Domains_Tags` | TEXT | NULL | Comma-separated list of standardized domain tags. |
| `Application_Status` | TEXT | `'Uncontacted'` | Outreach pipeline stage (`Uncontacted`, `Reading Papers`, `Drafting Email`, `Contacted`, `Replied - Positive`, `Replied - Negative`, `Interview`, `Offer`, `Rejected`). |
| `User_Notes` | TEXT | `''` | Private user notes regarding papers, personal impressions, or conversation details. |
| `Priority` | INTEGER | `0` | Star rating from `0` to `5` for outreach priority. |
| `university_id` | INTEGER | NULL | Foreign key referencing `universities(id)`. |
| `Source` | TEXT | `'Agent'` | Data source (`'Agent'` for crawler, `'Manual'` for user additions). |

---

### Table: `universities`
Master registry of target institutions with geographic coordinates for the GIS Map Explorer.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique university ID. |
| `name` | TEXT | UNIQUE, NOT NULL | Canonical university name. |
| `country` | TEXT | DEFAULT 'USA' | Country name (e.g., "USA", "UK", "Switzerland", "Germany"). |
| `lat` | REAL | NULL | Latitude coordinate for map clustering. |
| `lon` | REAL | NULL | Longitude coordinate for map clustering. |

---

### Table: `logs`
CRM Outreach Journal entries for tracking daily outreach notes, weekly summaries, and monthly reviews.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique log ID. |
| `date` | TEXT | NOT NULL | Entry date in `YYYY-MM-DD` ISO format. |
| `log_type` | TEXT | NOT NULL | Type of journal entry (`Daily`, `Weekly`, `Monthly`). |
| `content` | TEXT | NOT NULL | HTML/rich text log content containing `@` researcher mentions. |
| `created_at` | TIMESTAMP | CURRENT_TIMESTAMP | Server creation timestamp. |

---

### Table: `log_researcher_links`
Many-to-many relationship linking outreach log entries with specific researcher profiles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `log_id` | INTEGER | REFERENCES logs(id) ON DELETE CASCADE | Log ID. |
| `researcher_id` | INTEGER | REFERENCES researchers(id) ON DELETE CASCADE | Researcher ID. |

---

## 2. Standardized Tag Taxonomy

To enable clean multi-select filtering and cross-filtering in the user interface, tags must be selected from the following canonical taxonomies:

### Methods Taxonomy
* **`NeuroAI / Machine Learning`**: Artificial neural networks, deep learning models of neural circuits, foundation models, reinforcement learning in brain systems.
* **`Brain Modeling`**: Biophysical modeling, dynamical systems, spiking network simulations, theoretical neuroscience.
* **`BCI`**: Brain-Computer Interfaces, neural decoders, closed-loop neuroprosthetics, invasive/non-invasive motor decoding.
* **`Electrophysiology`**: Patch clamp, multielectrode arrays (MEA), Neuropixels, intra-cranial EEG, single-unit recordings.
* **`Optical Imaging`**: Two-photon / multi-photon calcium imaging, voltage imaging, optogenetics, light-sheet microscopy.
* **`Neuroimaging`**: Functional MRI (fMRI), structural MRI, PET, MEG, diffuse optical tomography.
* **`Neuromodulation`**: TMS, tDCS, deep brain stimulation (DBS), ultrasound neuromodulation.
* **`Genomics / Bioinformatics`**: Single-cell RNA sequencing, spatial transcriptomics, neurogenetics.
* **`SNN / Neuromorphic`**: Spiking neural networks, neuromorphic hardware chips (e.g. Loihi, SpiNNaker), event-based sensing.

### Domains Taxonomy
* **`Visual`**: Visual cortex processing, object recognition, ventral stream, retinotopic mapping.
* **`Motor`**: Motor cortex, motor control, cerebellum, basal ganglia, locomotion, reaching.
* **`Memory`**: Hippocampus, memory consolidation, spatial navigation, place/grid cells.
* **`Decision Making`**: Prefrontal cortex, reward processing, economic choice, value-based decision making.
* **`Attention`**: Top-down/bottom-up attention, parietal cortex, sensory gating.
* **`Auditory`**: Auditory cortex, speech perception, sound localization, acoustic processing.
* **`Linguistic`**: Language comprehension, neural basis of syntax, semantics, speech production.
* **`Emotion / Social`**: Amygdala, social cognition, empathy, affective neuroscience.
* **`Sleep / Circadian`**: Sleep states, circadian rhythms, slow-wave sleep, sleep replay.
* **`Disease / Clinical`**: Alzheimer's, Parkinson's, epilepsy, psychiatric disorders, neurodegeneration.

---

## 3. New PI & Incoming PI Classifications

Lab establishment timing is critical for graduate applicants because new labs frequently possess startup funding and multiple open positions.

* **New PI (`badge-new`)**: Faculty establishing their lab in **2025** or **2026**.
  - Query condition: `Start_Time LIKE '%2025%' OR Start_Time LIKE '%2026%'`.
* **Incoming PI (`badge-incoming`)**: Faculty recruited to launch in **2027** or beyond.
  - Query condition: `Start_Time LIKE '%2027%'`.
* **Established PI**: Faculty who launched in 2024 or earlier.

---

## 4. Deduplication Rules

When merging multiple batches or re-scraping a department:
1. Normalize researcher name: Strip whitespace, lowercase, remove suffixes (`Ph.D.`, `MD`).
2. Normalize university name: Map synonyms (e.g., "MIT" -> "Massachusetts Institute of Technology (MIT)").
3. Deduplication Key: `(LOWER(Name), LOWER(University))`.
4. If a match is detected:
   - Prefer non-empty fields over empty fields.
   - Update `H_index` if the new value has higher citations.
   - Retain user CRM fields (`Application_Status`, `User_Notes`, `Priority`) unconditionally.
