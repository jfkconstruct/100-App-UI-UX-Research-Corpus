# AI-Assisted Analysis Workflow

This guide explains how to use AI vision capabilities to accelerate screen analysis.

## Overview

Instead of manually analyzing 300-1000 screenshots, this workflow uses AI to:
1. Generate structured analysis prompts
2. Analyze screenshots using vision AI
3. Produce pre-filled JSON templates
4. Validate and refine the results

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Capture screenshots (priority apps first)
npm run capture

# 3. Generate AI analysis prompts
npm run ai-analyze

# 4. Complete analysis (see options below)

# 5. Validate and build atlas
npm run extract-patterns
npm run build-atlas
```

## Priority Apps

Start with these 20 high-value apps (see `data/apps/priority_apps.yaml`):

### Tier 1 (Must-Analyze)
| App | Why | Key Patterns |
|-----|-----|--------------|
| Notion | Best-in-class onboarding | Progressive disclosure, templates |
| Duolingo | Gamification masterclass | Streaks, rewards, progress |
| Linear | Speed-first design | Command palette, keyboard-first |
| Stripe | Developer UX excellence | Docs integration, dashboard |
| Figma | Collaborative design | Multiplayer, real-time |

### Tier 2 (High-Value)
Airbnb, Spotify, Canva, Slack, Vercel

### Tier 3 (Pattern-Specific)
Typeform, Cal.com, Headspace, Robinhood, 1Password

### Tier 4 (Category Coverage)
Zapier, Loom, Superhuman, Arc, Railway

## Analysis Options

### Option 1: Interactive with Claude Code (Recommended)

Ask Claude Code to analyze screenshots directly:

```
"Analyze the screenshot at data/raw_screens/notion/landing/01-landing.png
using the pattern taxonomy and heuristics. Output JSON matching the
screens.json schema."
```

Claude can:
- Read and analyze screenshots
- Apply the pattern taxonomy
- Score heuristics
- Write directly to screens.json

### Option 2: Batch with Anthropic API

Use the generated prompts with the Anthropic API:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';

const client = new Anthropic();

async function analyzeScreenshot(imagePath: string, prompt: string) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Image
          }
        },
        { type: "text", text: prompt }
      ]
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

### Option 3: Manual with AI Chat

1. Open screenshot in image viewer
2. Copy prompt from `ai_analysis_prompts.json`
3. Paste into Claude.ai or ChatGPT with the image
4. Copy JSON response to `screens.json`

## Workflow Steps

### Step 1: Capture Screenshots

```bash
npm run capture
```

This captures:
- Landing page (initial view)
- Scrolled views (2 additional positions)
- CTA/Signup page (if detectable)

Output: `data/raw_screens/{app_id}/{flow}/*.png`

### Step 2: Generate Analysis Prompts

```bash
npm run ai-analyze
npm run ai-analyze -- --app=notion  # Single app
npm run ai-analyze -- --dry-run     # Preview only
```

Output per app:
- `ai_analysis_prompts.json` - Full prompts with pattern reference
- `screens_template.json` - Placeholder JSON to fill in

### Step 3: Analyze Screenshots

Use your preferred method from the options above.

The analysis should produce JSON with:
- Screen type and layout
- User and business goals
- CTAs and navigation elements
- UI patterns (from taxonomy)
- Heuristic scores (1-5)
- Notes

### Step 4: Validate Results

```bash
npm run extract-patterns
```

This will:
- Validate pattern IDs against taxonomy
- Check heuristic score ranges
- Flag missing or invalid data
- Generate `patterns_summary.json`

### Step 5: Build Atlas

```bash
npm run build-atlas
```

Generates:
- `data/atlas/pattern-atlas.md` - Pattern usage across apps
- `data/atlas/flow-atlas.md` - Flow comparisons
- `data/atlas/heuristics-report.md` - Quality insights

## Screen Analysis Schema

```json
{
  "screen_id": "landing-01",
  "app_id": "notion",
  "flow_id": "landing",
  "step_index": 0,
  "image_path": "data/raw_screens/notion/landing/01-landing.png",
  "screen_type": "landing",
  "layout_type": "hero-cta",
  "primary_user_goal": "Understand what Notion offers",
  "primary_business_goal": "Get user to sign up",
  "primary_cta_label": "Get Notion free",
  "secondary_cta_labels": ["Request a demo", "Log in"],
  "navigation_elements": ["Product", "Templates", "Pricing"],
  "copy_summary": "All-in-one workspace for notes, docs, and collaboration",
  "patterns": [
    "single-primary-cta",
    "benefit-headline",
    "hero-illustration",
    "social-proof"
  ],
  "heuristics": {
    "clarity": 5,
    "cognitive_load": 4,
    "visual_hierarchy": 5,
    "feedback": 3,
    "accessibility": 4,
    "conversion_strength": 5
  },
  "notes": "Clean hero with strong value proposition. Social proof with logos."
}
```

## Heuristics Scoring Guide

| Score | Meaning |
|-------|---------|
| 1 | Poor - Significant issues |
| 2 | Below Average - Notable problems |
| 3 | Average - Functional but unremarkable |
| 4 | Good - Minor issues only |
| 5 | Excellent - Best practices followed |

### Scoring Criteria

**Clarity**: Can users immediately understand purpose and next steps?
**Cognitive Load**: How much mental effort to use?
**Visual Hierarchy**: Are important elements prominent?
**Feedback**: Does UI confirm actions and communicate state?
**Accessibility**: Inclusive design quality (contrast, labels, etc.)
**Conversion Strength**: CTA effectiveness and persuasiveness

## Tips for Quality Analysis

1. **Be consistent** - Use the same standards across all apps
2. **Use taxonomy IDs** - Don't invent new pattern names
3. **Score objectively** - Don't inflate scores for "good" apps
4. **Note patterns** - Even partial implementations count
5. **Document concerns** - Accessibility issues, dark patterns, etc.

## Time Estimates

| Method | Time per Screen | 20 Apps (60 screens) |
|--------|-----------------|----------------------|
| Fully manual | 10-15 min | 10-15 hours |
| AI-assisted + review | 2-3 min | 2-3 hours |
| Batch API + review | 1-2 min | 1-2 hours |

## Troubleshooting

**Screenshots blocked/empty**
- Some sites block automated capture
- Try manual screenshots or browser extensions

**Pattern not in taxonomy**
- Check `config/patterns-taxonomy.json`
- Add new patterns if genuinely missing

**Heuristic validation fails**
- Ensure scores are 1-5 integers
- Check for typos in field names

**API rate limits**
- Add delays between requests
- Use batch processing with retries
