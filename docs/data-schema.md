# Data Schema Reference

This document defines all JSON structures used in the UI/UX Research Corpus.

## Overview

The corpus uses five primary data structures:

1. **App Metadata** (`meta.json`) — Basic app information
2. **Flow Records** (`flows.json`) — High-level user journeys
3. **Screen Records** (`screens.json`) — Individual screen analysis
4. **Pattern Summary** (`patterns_summary.json`) — Aggregated pattern statistics
5. **Configuration Files** — Heuristics and pattern taxonomy

---

## 1. App Metadata

**File:** `data/apps/{app_id}/meta.json`

**Purpose:** Stores basic information about each application in the corpus.

### Schema

```typescript
interface AppMetadata {
  app_id: string;           // Unique identifier (lowercase, hyphenated)
  name: string;             // Display name
  platforms: Platform[];    // Where the app is available
  category: string;         // Primary category
  url: string;              // Main web URL
  store_links?: {           // Optional app store links
    ios?: string;
    android?: string;
  };
  why_interesting: string[]; // Reasons for inclusion in corpus
}

type Platform = "web" | "ios" | "android" | "desktop";
```

### Example

```json
{
  "app_id": "notion",
  "name": "Notion",
  "platforms": ["web", "ios", "android", "desktop"],
  "category": "productivity",
  "url": "https://www.notion.so",
  "store_links": {
    "ios": "https://apps.apple.com/app/notion/id1232780281",
    "android": "https://play.google.com/store/apps/details?id=notion.id"
  },
  "why_interesting": [
    "Best-in-class onboarding with progressive disclosure",
    "Complex feature set with relatively low perceived friction",
    "Excellent information architecture",
    "Strong use of empty states and educational moments"
  ]
}
```

### Field Descriptions

- **app_id**: Used in file paths and references. Must be URL-safe.
- **name**: Human-readable app name.
- **platforms**: All platforms where app is available. Helps with cross-platform pattern analysis.
- **category**: Used for grouping in reports. Examples: productivity, social, e-commerce, education, finance, health, entertainment.
- **url**: Primary URL for web apps, or marketing site for mobile-only apps.
- **store_links**: Direct links to app stores for installation.
- **why_interesting**: UX research justification. What makes this app worth studying?

### How UI/UX GPT Uses This

- Context for pattern analysis ("This is a productivity app, so focus on efficiency patterns")
- Cross-platform pattern comparison
- Category-specific best practices
- Building categorized pattern libraries

---

## 2. Flow Records

**File:** `data/apps/{app_id}/flows.json`

**Purpose:** Defines high-level user journeys and groups related screens.

### Schema

```typescript
interface Flow {
  flow_id: string;              // Unique identifier within app
  name: string;                 // Display name
  primary_user_goal: string;    // What the user wants to accomplish
  business_goal: string;        // What the business wants to achieve
  entry_point: string;          // Where the flow starts
  exit_point: string;           // Where the flow ends (success state)
  screens: string[];            // Array of screen_ids in sequence
}
```

### Example

```json
[
  {
    "flow_id": "onboarding",
    "name": "Onboarding",
    "primary_user_goal": "Get set up and understand basic value quickly",
    "business_goal": "Activate new users and reduce early churn",
    "entry_point": "signup",
    "exit_point": "user reaches main workspace",
    "screens": ["onboarding-01", "onboarding-02", "onboarding-03", "onboarding-04"]
  },
  {
    "flow_id": "page-creation",
    "name": "Page Creation",
    "primary_user_goal": "Create a new page and start adding content",
    "business_goal": "Drive content creation and engagement",
    "entry_point": "new page button in sidebar",
    "exit_point": "user typing in new page",
    "screens": ["page-creation-01", "page-creation-02"]
  }
]
```

### Field Descriptions

- **flow_id**: Short identifier (e.g., "onboarding", "checkout", "search").
- **name**: Human-readable flow name.
- **primary_user_goal**: User's objective. Focus on the "why" from user perspective.
- **business_goal**: Company's objective. What metric does this flow improve?
- **entry_point**: Where users start this flow (screen or action).
- **exit_point**: Success state definition.
- **screens**: Ordered list of screen_ids that make up this flow.

### Common Flow Types

- **onboarding**: First-time user experience
- **authentication**: Sign up / login
- **search**: Finding content/products
- **checkout**: Purchase completion
- **content-creation**: Creating/editing content
- **settings**: Account and app configuration
- **navigation**: Moving between sections
- **social**: Following, sharing, commenting
- **notifications**: Alert and update management

### How UI/UX GPT Uses This

- Compare onboarding flows across apps
- Identify best practices for specific flow types
- Understand user goal → pattern mappings
- Generate flow recommendations for new products
- Analyze flow length and complexity patterns

---

## 3. Screen Records

**File:** `data/apps/{app_id}/screens.json`

**Purpose:** Detailed analysis of individual screens, including patterns and heuristic scores.

### Schema

```typescript
interface Screen {
  screen_id: string;                    // Unique identifier within app
  app_id: string;                       // Reference to parent app
  flow_id: string;                      // Reference to parent flow
  step_index: number;                   // Position in flow (0-indexed)
  image_path: string;                   // Relative path to screenshot
  screen_type: string;                  // Classification of screen
  layout_type: string;                  // Layout pattern
  primary_user_goal: string;            // What user wants at this step
  primary_business_goal: string;        // What business wants
  primary_cta_label: string;            // Main call-to-action text
  secondary_cta_labels: string[];       // Other action labels
  navigation_elements: string[];        // Nav components present
  copy_summary: string;                 // Brief description of text content
  patterns: string[];                   // UI pattern IDs (from taxonomy)
  heuristics: HeuristicScores;          // Quality scores (0-5)
  notes: string;                        // Analyst observations
}

interface HeuristicScores {
  clarity: number;              // Is the purpose and next step clear?
  cognitive_load: number;       // How easy is it to process? (higher = lower load)
  visual_hierarchy: number;     // Is importance clearly communicated?
  feedback: number;             // Does the UI provide clear feedback?
  accessibility: number;        // Inclusive design quality
  conversion_strength: number;  // How compelling is the CTA/value prop?
}
```

### Example

```json
{
  "screen_id": "onboarding-01",
  "app_id": "notion",
  "flow_id": "onboarding",
  "step_index": 0,
  "image_path": "data/raw_screens/notion/onboarding/01-welcome.png",
  "screen_type": "welcome",
  "layout_type": "full-screen-modal",
  "primary_user_goal": "Understand what Notion is and decide to continue",
  "primary_business_goal": "Get the user to continue onboarding",
  "primary_cta_label": "Get Started",
  "secondary_cta_labels": ["Watch Demo"],
  "navigation_elements": ["progress-indicator", "skip-link"],
  "copy_summary": "Large headline 'Your wiki, docs & projects. Together.' with supporting copy explaining Notion's value. Clean illustration showing the product interface.",
  "patterns": [
    "progress-indicator",
    "single-primary-cta",
    "benefit-oriented-headline",
    "hero-illustration",
    "minimal-navigation"
  ],
  "heuristics": {
    "clarity": 4.5,
    "cognitive_load": 4.0,
    "visual_hierarchy": 4.5,
    "feedback": 3.5,
    "accessibility": 3.5,
    "conversion_strength": 4.0
  },
  "notes": "Strong clarity with benefit-focused headline. Skip link is present but subtle (potential friction for users who want to skip). Progress indicator helps set expectations. The illustration is helpful but could be more specific to user's use case."
}
```

### Field Descriptions

#### Identification
- **screen_id**: Unique within app. Suggest format: `{flow_id}-{step_index}` or `{flow_id}-{descriptive_slug}`.
- **app_id**: Must match the parent app's `app_id`.
- **flow_id**: Must match a flow defined in `flows.json`.
- **step_index**: 0-based position in the flow sequence.

#### Visual & Content
- **image_path**: Relative path from repo root to the screenshot.
- **screen_type**: Classification like "welcome", "form", "dashboard", "modal", "list", "detail", "empty-state", "error", "success".
- **layout_type**: Pattern like "full-screen-modal", "sidebar-layout", "bottom-sheet", "card-grid", "list-view", "split-view".

#### Goals
- **primary_user_goal**: User's main objective on this screen.
- **primary_business_goal**: Business metric this screen optimizes for.

#### UI Elements
- **primary_cta_label**: The most prominent button/link text.
- **secondary_cta_labels**: Other action labels available.
- **navigation_elements**: Components like "hamburger-menu", "bottom-tab-bar", "breadcrumbs", "back-button", "search-bar".
- **copy_summary**: Brief description of headlines, body copy, and microcopy.

#### Analysis
- **patterns**: Array of pattern IDs from `config/patterns-taxonomy.json`.
- **heuristics**: Scores (0-5 scale) for each defined heuristic.
- **notes**: Freeform observations, critiques, and insights.

### Heuristic Scoring Guide

**0 = Critical issues** — Major usability problems
**1 = Poor** — Significant friction
**2 = Below average** — Noticeable issues
**3 = Average** — Acceptable but not remarkable
**4 = Good** — Above average, well-designed
**5 = Excellent** — Best-in-class

- **Clarity**: Can users immediately understand what this screen is for and what they should do next?
- **Cognitive Load**: How much mental effort is required? (Higher score = easier to process)
- **Visual Hierarchy**: Are the most important elements visually prominent?
- **Feedback**: Does the UI confirm actions and communicate state changes?
- **Accessibility**: Color contrast, text size, keyboard navigation, screen reader support.
- **Conversion Strength**: For CTAs and value props, how compelling is the presentation?

### How UI/UX GPT Uses This

- Identify which patterns correlate with high heuristic scores
- Generate screen-by-screen recommendations
- Compare similar screen types across apps
- Extract best practices for specific goals
- Build training data for pattern recognition
- Provide evidence-based design critiques

---

## 4. Pattern Summary

**File:** `data/apps/{app_id}/patterns_summary.json`

**Purpose:** Aggregated statistics about pattern usage within an app. Generated by `extract_patterns.ts`.

### Schema

```typescript
interface PatternSummary {
  app_id: string;
  total_screens: number;
  patterns: PatternStats[];
  flows: FlowPatternStats[];
}

interface PatternStats {
  pattern_id: string;
  pattern_name: string;
  frequency: number;                    // How many screens use this
  percentage: number;                   // Percentage of total screens
  avg_heuristics: HeuristicScores;      // Average scores when pattern is used
  screens: string[];                    // List of screen_ids using this pattern
}

interface FlowPatternStats {
  flow_id: string;
  flow_name: string;
  unique_patterns: string[];            // All patterns used in this flow
  pattern_combinations: string[][];     // Common pattern pairs
}
```

### Example

```json
{
  "app_id": "notion",
  "total_screens": 12,
  "patterns": [
    {
      "pattern_id": "progress-indicator",
      "pattern_name": "Progress Indicator",
      "frequency": 4,
      "percentage": 33.3,
      "avg_heuristics": {
        "clarity": 4.2,
        "cognitive_load": 4.0,
        "visual_hierarchy": 4.3,
        "feedback": 4.5,
        "accessibility": 3.8,
        "conversion_strength": 3.9
      },
      "screens": ["onboarding-01", "onboarding-02", "onboarding-03", "onboarding-04"]
    },
    {
      "pattern_id": "single-primary-cta",
      "pattern_name": "Single Primary CTA",
      "frequency": 8,
      "percentage": 66.7,
      "avg_heuristics": {
        "clarity": 4.4,
        "cognitive_load": 4.2,
        "visual_hierarchy": 4.6,
        "feedback": 3.7,
        "accessibility": 3.6,
        "conversion_strength": 4.3
      },
      "screens": ["onboarding-01", "onboarding-02", "onboarding-03", "onboarding-04", "page-creation-01", "settings-01", "upgrade-01", "share-01"]
    }
  ],
  "flows": [
    {
      "flow_id": "onboarding",
      "flow_name": "Onboarding",
      "unique_patterns": [
        "progress-indicator",
        "single-primary-cta",
        "benefit-oriented-headline",
        "hero-illustration",
        "minimal-navigation"
      ],
      "pattern_combinations": [
        ["progress-indicator", "single-primary-cta"],
        ["benefit-oriented-headline", "hero-illustration"],
        ["single-primary-cta", "minimal-navigation"]
      ]
    }
  ]
}
```

### How UI/UX GPT Uses This

- Identify an app's "pattern signature"
- Find patterns that consistently score high
- Discover effective pattern combinations
- Compare pattern usage across categories
- Generate data-driven pattern recommendations

---

## 5. Configuration Files

### 5.1 Heuristics Configuration

**File:** `config/heuristics.json`

**Purpose:** Define the heuristics used for scoring and their weights.

#### Schema

```typescript
interface HeuristicsConfig {
  heuristics: Heuristic[];
}

interface Heuristic {
  id: string;           // Matches key in HeuristicScores
  name: string;         // Display name
  weight: number;       // Importance multiplier (default: 1.0)
  description?: string; // What this measures
}
```

#### Example

```json
{
  "heuristics": [
    {
      "id": "clarity",
      "name": "Clarity",
      "weight": 1.0,
      "description": "Can users immediately understand the purpose and next steps?"
    },
    {
      "id": "cognitive_load",
      "name": "Cognitive Load",
      "weight": 1.0,
      "description": "How much mental effort is required to use this screen?"
    },
    {
      "id": "visual_hierarchy",
      "name": "Visual Hierarchy",
      "weight": 1.0,
      "description": "Are important elements visually prominent?"
    },
    {
      "id": "feedback",
      "name": "Feedback & Status",
      "weight": 0.8,
      "description": "Does the UI confirm actions and communicate state?"
    },
    {
      "id": "accessibility",
      "name": "Accessibility",
      "weight": 1.2,
      "description": "Inclusive design: contrast, text size, keyboard nav, screen readers"
    },
    {
      "id": "conversion_strength",
      "name": "Conversion Strength",
      "weight": 1.3,
      "description": "For CTAs and value props, how compelling is the presentation?"
    }
  ]
}
```

### 5.2 Pattern Taxonomy

**File:** `config/patterns-taxonomy.json`

**Purpose:** Controlled vocabulary of UI patterns with definitions.

#### Schema

```typescript
interface PatternTaxonomy {
  patterns: Pattern[];
}

interface Pattern {
  id: string;           // Unique identifier
  name: string;         // Display name
  category: string;     // Grouping (onboarding, navigation, forms, etc.)
  description: string;  // What this pattern is and when to use it
  aliases?: string[];   // Alternative names
}
```

#### Example

```json
{
  "patterns": [
    {
      "id": "progress-indicator",
      "name": "Progress Indicator",
      "category": "onboarding",
      "description": "Shows user where they are in a multi-step flow. Reduces anxiety and sets expectations.",
      "aliases": ["stepper", "wizard-progress"]
    },
    {
      "id": "single-primary-cta",
      "name": "Single Primary CTA",
      "category": "decision",
      "description": "One obvious next step with limited choices. Reduces decision paralysis.",
      "aliases": ["single-cta", "primary-action"]
    },
    {
      "id": "bottom-tab-bar",
      "name": "Bottom Tab Bar",
      "category": "navigation",
      "description": "Mobile navigation pattern with 3-5 primary sections accessible from bottom of screen.",
      "aliases": ["tab-bar", "bottom-nav"]
    }
  ]
}
```

---

## Data Relationships

```
AppMetadata (meta.json)
    ↓ (1:many)
Flow (flows.json)
    ↓ (1:many)
Screen (screens.json)
    ↓ (references)
Pattern (patterns-taxonomy.json)
    ↓ (scored by)
Heuristic (heuristics.json)
```

---

## Validation Rules

1. **app_id** must be unique across all apps
2. **flow_id** must be unique within an app
3. **screen_id** must be unique within an app
4. All **pattern IDs** in screens.json must exist in patterns-taxonomy.json
5. All **heuristic keys** in screens must exist in heuristics.json
6. **Heuristic scores** must be between 0 and 5
7. **image_path** must point to an existing file
8. **screens array** in flows.json must reference valid screen_ids

---

## TypeScript Type Definitions

For use in scripts:

```typescript
// types.ts
export type Platform = "web" | "ios" | "android" | "desktop";

export interface AppMetadata {
  app_id: string;
  name: string;
  platforms: Platform[];
  category: string;
  url: string;
  store_links?: {
    ios?: string;
    android?: string;
  };
  why_interesting: string[];
}

export interface Flow {
  flow_id: string;
  name: string;
  primary_user_goal: string;
  business_goal: string;
  entry_point: string;
  exit_point: string;
  screens: string[];
}

export interface HeuristicScores {
  clarity: number;
  cognitive_load: number;
  visual_hierarchy: number;
  feedback: number;
  accessibility: number;
  conversion_strength: number;
}

export interface Screen {
  screen_id: string;
  app_id: string;
  flow_id: string;
  step_index: number;
  image_path: string;
  screen_type: string;
  layout_type: string;
  primary_user_goal: string;
  primary_business_goal: string;
  primary_cta_label: string;
  secondary_cta_labels: string[];
  navigation_elements: string[];
  copy_summary: string;
  patterns: string[];
  heuristics: HeuristicScores;
  notes: string;
}

export interface PatternStats {
  pattern_id: string;
  pattern_name: string;
  frequency: number;
  percentage: number;
  avg_heuristics: HeuristicScores;
  screens: string[];
}

export interface FlowPatternStats {
  flow_id: string;
  flow_name: string;
  unique_patterns: string[];
  pattern_combinations: string[][];
}

export interface PatternSummary {
  app_id: string;
  total_screens: number;
  patterns: PatternStats[];
  flows: FlowPatternStats[];
}

export interface Heuristic {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface HeuristicsConfig {
  heuristics: Heuristic[];
}

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  aliases?: string[];
}

export interface PatternTaxonomy {
  patterns: Pattern[];
}
```

---

## Best Practices

### Naming Conventions

- **app_id**: lowercase, hyphenated (e.g., "google-docs", "notion", "figma")
- **flow_id**: lowercase, hyphenated (e.g., "onboarding", "page-creation", "file-upload")
- **screen_id**: format as `{flow_id}-{step_number}` or `{flow_id}-{slug}` (e.g., "onboarding-01", "checkout-payment")
- **pattern_id**: lowercase, hyphenated (e.g., "progress-indicator", "floating-action-button")

### Consistency

- Use the same pattern IDs across all apps
- Maintain consistent flow_id naming for similar flows
- Use standardized screen_type values
- Apply heuristic scoring criteria uniformly

### Documentation

- Always include notes for non-obvious design decisions
- Document why a pattern works or fails in context
- Reference specific UI elements in copy_summary
- Explain heuristic scores when they're unusually high or low
