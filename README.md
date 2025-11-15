# UI/UX Research Corpus

A structured research corpus analyzing UI/UX patterns from ~100 leading applications across categories.

## High-Level Overview

### Goal

Transform approximately 100 carefully selected applications into a **structured UX research corpus** that includes:

- Screenshots of key user flows
- Labeled screen types and flows
- Tagged UI patterns
- Heuristic scores per screen and flow
- Extracted user goals and business objectives
- A comprehensive **UX Pattern Atlas** (Markdown/HTML)

### Purpose

This corpus feeds:

- **UI/UX Designer GPT** — AI-powered design assistance with real-world pattern knowledge
- **Future product designs** — Research-backed pattern library
- **Workshops, talks, and content** — Real examples from successful apps
- **Consulting deliverables** — Evidence-based UX recommendations

### Core Pipelines

1. **App Ingestion** — Curate a list of ~100 apps with metadata and rationale
2. **Screenshot Capture** — Automated browser-based screenshot collection
3. **Screen & Flow Labeling** — Structure generation for LLM-assisted analysis
4. **Pattern & Heuristic Extraction** — Identify patterns and score UX quality
5. **UX Pattern Atlas Generation** — Aggregate insights into searchable documentation

## How to Use

### 1. Add Apps to the Corpus

Edit `data/apps/apps_seed.yaml` to add new applications:

```yaml
- app_id: notion
  name: Notion
  category: productivity
  platforms: [web, ios, android]
  url: "https://www.notion.so"
  notes: ["Best-in-class onboarding", "Complex product with low friction"]
```

### 2. Run the Pipeline Scripts

#### Install Dependencies

```bash
npm install
# or
pnpm install
```

#### Capture Screenshots

```bash
npm run capture
```

Captures screenshots from apps in `apps_seed.yaml` and saves them to `data/raw_screens/{app_id}/`.

#### Generate Screen Label Templates

```bash
npm run gen-screens
```

Creates structured JSON templates in `data/apps/{app_id}/screens.json` ready for manual or AI-assisted labeling.

#### Extract Patterns & Heuristics

```bash
npm run extract-patterns
```

Validates patterns, aggregates statistics, and creates `patterns_summary.json` for each app.

#### Build the UX Pattern Atlas

```bash
npm run build-atlas
```

Aggregates all app data into comprehensive Markdown atlases:
- `data/atlas/pattern-atlas.md`
- `data/atlas/flow-atlas.md`
- `data/atlas/heuristics-report.md`

### 3. Use the Atlas

The generated atlases serve as:

- **Reference documentation** for designers and product teams
- **Training data** for UI/UX Designer GPT
- **Research foundation** for workshops and consulting
- **Pattern library** for new product development

## Repository Structure

```text
uiux-research-corpus/
├── README.md
├── config/
│   ├── heuristics.json          # UX heuristics definitions & weights
│   └── patterns-taxonomy.json   # Controlled vocabulary of UI patterns
├── data/
│   ├── apps/
│   │   ├── apps_seed.yaml       # List of 100 apps to analyze
│   │   └── {app_slug}/
│   │       ├── meta.json        # App-level metadata
│   │       ├── flows.json       # High-level flows
│   │       ├── screens.json     # Screen-level data
│   │       ├── patterns_summary.json  # Aggregated pattern stats
│   │       └── notes.md         # Human observations
│   ├── raw_screens/
│   │   └── {app_slug}/{flow_name}/*.png  # Screenshot files
│   └── atlas/
│       ├── pattern-atlas.md     # Pattern reference
│       ├── flow-atlas.md        # Flow comparisons
│       └── heuristics-report.md # Quality insights
├── scripts/
│   ├── capture_screenshots.ts   # Playwright-based capture
│   ├── generate_screen_labels.ts  # JSON template generator
│   ├── extract_patterns.ts      # Pattern tagging & scoring
│   ├── build_atlas.ts           # Markdown atlas builder
│   └── utils/
│       ├── fs-helpers.ts        # File system utilities
│       └── heuristics.ts        # Scoring functions
├── docs/
│   ├── pipeline-overview.md     # Detailed pipeline documentation
│   ├── data-schema.md           # JSON schema reference
│   └── uiux-gpt-integration.md  # Integration guide
└── logs/
    └── missing_patterns.log     # Validation warnings
```

## Documentation

- **[Pipeline Overview](docs/pipeline-overview.md)** — Detailed explanation of each pipeline stage
- **[Data Schema](docs/data-schema.md)** — JSON structure reference and examples
- **[UI/UX GPT Integration](docs/uiux-gpt-integration.md)** — How to use this corpus with AI design tools

## Contributing

To add a new app to the corpus:

1. Add entry to `data/apps/apps_seed.yaml`
2. Run `npm run capture` to get screenshots
3. Run `npm run gen-screens` to create templates
4. Fill in the generated `screens.json` with analysis
5. Run `npm run extract-patterns` and `npm run build-atlas` to update the corpus

## License

This research corpus is for educational and research purposes.
