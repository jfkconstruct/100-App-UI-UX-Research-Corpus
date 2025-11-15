# UI/UX GPT Integration Guide

This document explains how to integrate the UI/UX Research Corpus with your UI/UX Designer GPT or other AI-powered design tools.

## Overview

The corpus provides structured, evidence-based UX knowledge that can power:

- **Design recommendations** based on proven patterns
- **Heuristic evaluation** using real-world benchmarks
- **Flow optimization** informed by best-in-class implementations
- **Pattern discovery** with quality metrics
- **Context-aware suggestions** based on app category and goals

## Integration Methods

### 1. RAG (Retrieval-Augmented Generation)

**Best for:** Dynamic, query-based pattern retrieval

**How it works:**
1. Index the atlas files and pattern data
2. When user asks for design help, retrieve relevant patterns
3. Use retrieved context to inform GPT responses

**Files to index:**
- `data/atlas/pattern-atlas.md` — Full pattern catalog
- `data/atlas/flow-atlas.md` — Flow comparisons
- `data/atlas/heuristics-report.md` — Quality insights
- `data/apps/*/screens.json` — Detailed screen data
- `data/apps/*/notes.md` — Human observations

**Example queries:**
- "Show me best onboarding patterns for a productivity app"
- "What patterns work well for mobile navigation?"
- "Find high-converting CTA patterns"

### 2. Fine-Tuning Dataset

**Best for:** Embedding pattern knowledge directly into model

**How it works:**
1. Convert corpus data into training examples
2. Fine-tune GPT on pattern recognition and recommendation
3. Model learns to suggest appropriate patterns based on context

**Training data format:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "I'm designing an onboarding flow for a productivity app. What patterns should I consider?"
    },
    {
      "role": "assistant",
      "content": "Based on analysis of 5 top productivity apps, here are key onboarding patterns:\n\n1. **Progress Indicator** (used in 80% of flows)\n   - Average clarity score: 4.5/5.0\n   - Reduces anxiety by setting expectations\n   - Example: Notion uses 4-step indicator\n\n2. **Smart Defaults** with use case selection\n   - Personalizes experience early\n   - Notion, Linear both implement this\n\n3. **Template System** for quick wins\n   - Accelerates time-to-value\n   - Conversion strength: 4.5/5.0\n\n[Include specific examples from corpus]"
    }
  ]
}
```

### 3. Custom GPT Instructions

**Best for:** Quick integration without infrastructure

**How it works:**
1. Upload key atlas files to Custom GPT
2. Add instruction to reference the corpus
3. GPT uses files as knowledge base

**Instructions template:**

```
You are a UI/UX design expert with access to a research corpus of 100 analyzed applications.

When providing design recommendations:
1. Reference specific patterns from the Pattern Atlas
2. Cite heuristic scores and examples from real apps
3. Consider the user's app category and goals
4. Provide evidence-based rationale for suggestions
5. Include "when it works" and "when to avoid" guidance

Available resources:
- pattern-atlas.md: Catalog of UI patterns with quality scores
- flow-atlas.md: Common flow implementations across apps
- heuristics-report.md: Quality insights and top-performing patterns
- data-schema.md: Understanding the data structure

Always ground recommendations in corpus data when possible.
```

## Using the Corpus Data

### Pattern Recommendations

**Query pattern:**
"I need a [pattern type] for [use case] in a [category] app"

**Response structure:**
1. Identify relevant patterns from taxonomy
2. Show examples from similar apps (by category)
3. Cite heuristic scores (especially relevant metrics)
4. Provide implementation guidance
5. Warn about pitfalls

**Example:**

```
User: "I need a navigation pattern for a mobile e-commerce app"

GPT Response:
Based on the corpus analysis of e-commerce apps (Airbnb, similar patterns):

**Recommended: Bottom Tab Bar**
- Used in 3/3 analyzed e-commerce apps
- Average scores:
  - Clarity: 4.3/5.0
  - Accessibility: 4.1/5.0 (thumb-friendly)
  - Cognitive Load: 4.2/5.0 (always visible)

**Implementation notes:**
- Limit to 5 tabs maximum (cognitive load)
- Use icons + labels for clarity
- Highlight active tab clearly

**Examples from corpus:**
- Airbnb: 5-tab layout (Explore, Wishlists, Trips, Inbox, Profile)
- Score: 4.5/5.0 overall

[Image reference: data/raw_screens/airbnb/navigation/01-bottom-tabs.png]
```

### Heuristic Evaluation

**Query pattern:**
"Evaluate this [screen type/flow] design"

**Response structure:**
1. Score against each heuristic (0-5)
2. Compare to corpus benchmarks
3. Identify specific issues
4. Suggest improvements with examples

**Example:**

```
User: "Evaluate my onboarding welcome screen"

GPT Response:
Let me evaluate against the 6 UX heuristics using corpus benchmarks:

**Your Design:**
- Clarity: 3.5/5.0
  - Benchmark (onboarding welcomes): 4.2/5.0
  - Issue: Value proposition not immediately clear
  - Fix: See Notion's benefit-oriented headline (4.5/5.0)

- Visual Hierarchy: 4.0/5.0
  - Benchmark: 4.3/5.0
  - Solid, but CTA could be more prominent

[Continue for all heuristics with specific comparisons]

**Overall Score: 3.8/5.0**
Corpus benchmark for this screen type: 4.1/5.0

**Top Priority Improvements:**
1. Strengthen headline clarity (see pattern-atlas.md: benefit-oriented-headline)
2. Add progress indicator (80% of top onboarding flows use this)
```

### Flow Design

**Query pattern:**
"Design a [flow type] for [app context]"

**Response structure:**
1. Reference similar flows from corpus
2. Identify common patterns and combinations
3. Map user goals to design decisions
4. Provide step-by-step structure

**Example:**

```
User: "Design a checkout flow for a booking app"

GPT Response:
Based on flow-atlas.md analysis of checkout flows (Airbnb as primary reference):

**Recommended Flow Structure:**

Step 1: Review & Customize
- Pattern: Smart Defaults (pre-filled from search)
- Pattern: Inline Validation (prevent errors early)
- Airbnb approach: 4.3/5.0 clarity

Step 2: Payment Information
- Pattern: Input Masking (card numbers, dates)
- Pattern: Trust Indicators (security badges)
- High conversion strength patterns from corpus

Step 3: Confirmation
- Pattern: Success Confirmation with next steps
- Pattern: Email/SMS confirmation offer
- Feedback score: 4.8/5.0 (Airbnb example)

**Key Pattern Combinations:**
- Progress Indicator + Single Primary CTA (all steps)
- Smart Defaults + Inline Validation (form fields)

[Continue with detailed guidance]
```

## Querying Specific Data

### By Category

```javascript
// Find all patterns used in productivity apps
const productivityApps = ['notion', 'linear', 'slack'];
const patterns = aggregatePatternsForApps(productivityApps);

// Returns: Most common patterns with scores
```

### By Heuristic

```javascript
// Find patterns with high conversion strength
const highConversionPatterns = filterPatternsByHeuristic(
  'conversion_strength',
  threshold: 4.0
);

// Returns: Patterns scoring 4.0+ on conversion
```

### By Flow Type

```javascript
// Compare onboarding flows
const onboardingFlows = getFlowsByType('onboarding');
const analysis = compareFlows(onboardingFlows);

// Returns: Pattern usage, average scores, best examples
```

## Sample Prompts for UI/UX GPT

### Pattern Discovery

**Good prompt:**
"I'm designing a signup flow for a SaaS app. Based on the corpus, what are the top 3 patterns I should use, and why? Include heuristic scores."

**Great prompt:**
"I'm designing a signup flow for a project management SaaS app (like Linear). Based on patterns from the corpus that score 4.0+ on clarity and conversion strength, what should I implement? Show me specific examples with image paths."

### Design Critique

**Good prompt:**
"Here's my design for an empty state. How does it compare to corpus benchmarks?"

**Great prompt:**
"Here's my design for an empty state in a productivity app. Score it against the 6 heuristics, compare to similar screens in the corpus (Notion, Linear), and suggest specific improvements with pattern references."

### Learning & Research

**Good prompt:**
"What are the most effective patterns for mobile navigation?"

**Great prompt:**
"Compare mobile navigation patterns across categories in the corpus. Which patterns work best for content apps vs. productivity apps? Include heuristic scores and specific examples."

## Best Practices

### 1. Always Cite Sources

```
❌ "Use a bottom tab bar for navigation"
✅ "Use a bottom tab bar for navigation (clarity: 4.3/5.0 avg across 5 apps, see Airbnb example in pattern-atlas.md)"
```

### 2. Provide Context

```
❌ "This pattern has a low score"
✅ "This pattern scores 3.2/5.0 on accessibility, below the 4.0 corpus average for this pattern type"
```

### 3. Reference Specific Examples

```
❌ "Apps use progress indicators"
✅ "4 of 5 analyzed onboarding flows use progress indicators (Notion: screens/onboarding-01.png shows 4-step indicator, score: 4.5/5.0)"
```

### 4. Consider Trade-offs

```
❌ "Always use this pattern"
✅ "This pattern scores high on conversion (4.5/5.0) but lower on accessibility (3.2/5.0). Use when conversion is critical, but add ARIA labels and keyboard navigation."
```

## Updating the Corpus

As you add more apps and analyze screens:

1. Run the full pipeline (capture → label → extract → build)
2. The GPT automatically gets updated knowledge
3. New patterns will be discovered
4. Benchmark scores will evolve

The corpus becomes more valuable with each app added.

## Example Integration Code

### Simple Pattern Lookup

```typescript
import { loadPatternTaxonomy, aggregatePatternData } from './corpus';

async function getPatternRecommendation(
  patternType: string,
  category: string
): Promise<string> {
  const taxonomy = loadPatternTaxonomy();
  const pattern = taxonomy.patterns.find(p => p.id === patternType);

  if (!pattern) {
    return "Pattern not found";
  }

  const appsInCategory = getAppsByCategory(category);
  const usage = getPatternUsage(patternType, appsInCategory);

  return `
**${pattern.name}**

${pattern.description}

**Usage in ${category} apps:**
- Found in ${usage.appCount} of ${appsInCategory.length} apps
- Average quality score: ${usage.avgScore}/5.0
- Top example: ${usage.bestExample.appName} (${usage.bestExample.score}/5.0)

**Image reference:** ${usage.bestExample.imagePath}
  `.trim();
}
```

### Heuristic Comparison

```typescript
function compareToCorpus(
  userScores: HeuristicScores,
  screenType: string
): string {
  const corpusScreens = getScreensByType(screenType);
  const benchmarks = calculateBenchmarks(corpusScreens);

  const comparison = Object.keys(userScores).map(heuristic => {
    const userScore = userScores[heuristic];
    const benchmark = benchmarks[heuristic];
    const diff = userScore - benchmark;
    const status = diff >= 0 ? '✓' : '⚠';

    return `${status} ${heuristic}: ${userScore}/5.0 (benchmark: ${benchmark}/5.0)`;
  });

  return comparison.join('\n');
}
```

## Next Steps

1. Choose your integration method (RAG, fine-tuning, or Custom GPT)
2. Start with the Pattern Atlas and Heuristics Report
3. Test with sample queries
4. Iterate based on GPT performance
5. Expand corpus with more apps over time

The corpus is designed to grow and improve continuously, making your UI/UX GPT smarter with each addition.
