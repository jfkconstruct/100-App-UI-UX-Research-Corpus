# Pipeline Overview

This document explains each stage of the UI/UX Research Corpus pipeline, the scripts involved, and how data flows through the system.

## Pipeline Stages

### Stage 1: App Ingestion

**Goal:** Curate a high-quality list of applications worth analyzing.

**Process:**
1. Manually research and select apps across categories (productivity, social, e-commerce, education, etc.)
2. Document why each app is interesting from a UX perspective
3. Record metadata: name, URL, platforms, category

**Input:** Manual research and curation

**Output:** `data/apps/apps_seed.yaml`

**Script:** None (manual process)

**Example Entry:**
```yaml
- app_id: notion
  name: Notion
  category: productivity
  platforms: [web, ios, android]
  url: "https://www.notion.so"
  notes:
    - "Best-in-class onboarding with progressive disclosure"
    - "Complex feature set with relatively low perceived friction"
```

---

### Stage 2: Screenshot Capture

**Goal:** Automatically capture screenshots of key flows from each application.

**Process:**
1. Read `data/apps/apps_seed.yaml`
2. For each app with a web URL:
   - Launch headless browser (Playwright)
   - Navigate to the URL
   - Capture landing page
   - Scroll and capture additional views
   - Save screenshots with organized naming
3. Create directory structure: `data/raw_screens/{app_id}/{flow_name}/{step}-{slug}.png`

**Input:** `data/apps/apps_seed.yaml`

**Output:** Screenshot files in `data/raw_screens/`

**Script:** `scripts/capture_screenshots.ts`

**How to Run:**
```bash
npm run capture
```

**Configuration:**
- Modify screenshot dimensions, wait times, and capture logic in the script
- For apps requiring authentication, you may need to manually capture screenshots

**Notes:**
- Not all apps will have web versions accessible without login
- For mobile-only apps, manual screenshot capture may be required
- Consider using mobile viewport simulation for responsive apps

---

### Stage 3: Screen & Flow Labeling

**Goal:** Generate structured JSON templates for each screenshot, ready for human or AI-assisted analysis.

**Process:**
1. Scan `data/raw_screens/{app_id}/` for all screenshots
2. For each screenshot, generate a JSON object with:
   - Basic metadata (screen_id, app_id, image_path)
   - Empty/placeholder fields for analysis (screen_type, patterns, heuristics, etc.)
3. Group screens into potential flows based on folder structure
4. Write templates to `data/apps/{app_id}/screens.json`

**Input:**
- Screenshot files from `data/raw_screens/{app_id}/`
- Pattern taxonomy from `config/patterns-taxonomy.json`

**Output:**
- `data/apps/{app_id}/screens.json` (template)
- `data/apps/{app_id}/flows.json` (template)

**Script:** `scripts/generate_screen_labels.ts`

**How to Run:**
```bash
npm run gen-screens
```

**Post-Processing:**
After running this script, you (or your UI/UX Designer GPT) should:
1. Review each screen template
2. Fill in the empty fields with actual analysis
3. Add pattern tags from the taxonomy
4. Assign heuristic scores (0-5 scale)
5. Write observations in the `notes` field

**Example Template:**
```json
{
  "screen_id": "onboarding-01",
  "app_id": "notion",
  "flow_id": "",
  "step_index": 0,
  "image_path": "data/raw_screens/notion/onboarding/01-welcome.png",
  "screen_type": "",
  "layout_type": "",
  "primary_user_goal": "",
  "primary_business_goal": "",
  "primary_cta_label": "",
  "secondary_cta_labels": [],
  "navigation_elements": [],
  "copy_summary": "",
  "patterns": [],
  "heuristics": {
    "clarity": 0,
    "cognitive_load": 0,
    "visual_hierarchy": 0,
    "feedback": 0,
    "accessibility": 0,
    "conversion_strength": 0
  },
  "notes": ""
}
```

---

### Stage 4: Pattern & Heuristic Extraction

**Goal:** Validate pattern tags, aggregate statistics, and compute pattern-level insights.

**Process:**
1. Read `data/apps/{app_id}/screens.json` for all apps
2. Validate that all referenced patterns exist in `config/patterns-taxonomy.json`
3. Log any missing patterns to `logs/missing_patterns.log`
4. For each app, compute:
   - Pattern frequency (how many screens use each pattern)
   - Average heuristic scores per pattern
   - Flow-level pattern combinations
5. Generate `data/apps/{app_id}/patterns_summary.json`

**Input:**
- `data/apps/{app_id}/screens.json` (filled with analysis)
- `config/patterns-taxonomy.json`
- `config/heuristics.json`

**Output:**
- `data/apps/{app_id}/patterns_summary.json`
- `logs/missing_patterns.log`

**Script:** `scripts/extract_patterns.ts`

**How to Run:**
```bash
npm run extract-patterns
```

**What This Enables:**
- Identify which patterns appear most frequently across an app
- See average quality scores for each pattern usage
- Find pattern combinations that work well together
- Validate taxonomy completeness

---

### Stage 5: UX Pattern Atlas Generation

**Goal:** Aggregate all app data into comprehensive, searchable Markdown documentation.

**Process:**
1. Read all app data from `data/apps/*/`
2. Aggregate patterns across all apps
3. Generate three main atlases:
   - **Pattern Atlas:** Pattern definitions, usage examples, quality metrics
   - **Flow Atlas:** Common flow types (onboarding, search, checkout) with app comparisons
   - **Heuristics Report:** Quality insights, best/worst examples, pattern-heuristic correlations

**Input:**
- All `data/apps/{app_id}/meta.json`
- All `data/apps/{app_id}/flows.json`
- All `data/apps/{app_id}/screens.json`
- All `data/apps/{app_id}/patterns_summary.json`
- `config/patterns-taxonomy.json`
- `config/heuristics.json`

**Output:**
- `data/atlas/pattern-atlas.md`
- `data/atlas/flow-atlas.md`
- `data/atlas/heuristics-report.md`

**Script:** `scripts/build_atlas.ts`

**How to Run:**
```bash
npm run build-atlas
```

**Atlas Contents:**

#### Pattern Atlas
For each pattern:
- Definition from taxonomy
- Category and use cases
- List of apps using this pattern
- Example screens (with image paths)
- Average heuristic scores across all uses
- "When it works" / "When to avoid" guidance

#### Flow Atlas
For each common flow type:
- Apps that implement this flow
- Common pattern combinations
- Best-in-class examples
- Common pitfalls
- Heuristic comparisons

#### Heuristics Report
- Overall corpus statistics
- Top 10 screens by each heuristic
- Patterns most associated with high scores
- Patterns to avoid (low scores)
- Category-level insights

---

## Complete Pipeline Execution

To process a new app from start to finish:

```bash
# 1. Add app to apps_seed.yaml manually

# 2. Capture screenshots
npm run capture

# 3. Generate templates
npm run gen-screens

# 4. Fill in the templates manually or with AI assistance
# Edit data/apps/{app_id}/screens.json
# Edit data/apps/{app_id}/flows.json

# 5. Extract patterns and validate
npm run extract-patterns

# 6. Rebuild the atlas
npm run build-atlas
```

---

## Data Flow Diagram

```
apps_seed.yaml
    ↓
[capture_screenshots.ts]
    ↓
data/raw_screens/{app_id}/*.png
    ↓
[generate_screen_labels.ts]
    ↓
data/apps/{app_id}/screens.json (templates)
    ↓
[Manual/AI Analysis] ← config/patterns-taxonomy.json
    ↓
data/apps/{app_id}/screens.json (filled)
    ↓
[extract_patterns.ts] ← config/heuristics.json
    ↓
data/apps/{app_id}/patterns_summary.json
    ↓
[build_atlas.ts]
    ↓
data/atlas/*.md
```

---

## Tips for Success

### Consistent Categorization
- Use the same pattern IDs across all apps (from `patterns-taxonomy.json`)
- Maintain consistent flow naming (e.g., "onboarding", not "onboard" or "sign-up-flow")
- Use standardized screen types

### Quality Analysis
- Be honest with heuristic scores (they're more useful when varied)
- Include specific observations in the `notes` field
- Reference specific UI elements in `copy_summary`

### Incremental Processing
- You don't need to analyze all 100 apps at once
- Start with 5-10 exemplary apps
- Build the atlas incrementally
- Add apps as you discover interesting patterns

### Validation
- Run `extract-patterns` frequently to catch taxonomy gaps
- Review `logs/missing_patterns.log` and update taxonomy as needed
- Rebuild atlas after adding multiple apps to see emerging trends
