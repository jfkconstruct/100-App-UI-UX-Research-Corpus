#!/usr/bin/env ts-node

/**
 * AI-Assisted Screen Analysis Workflow
 *
 * This script provides a framework for AI-assisted analysis of UI screenshots.
 * It generates structured prompts and templates that can be used with vision AI
 * to analyze screens and extract UI/UX patterns.
 *
 * Usage:
 *   npm run ai-analyze               # Analyze all captured screenshots
 *   npm run ai-analyze -- --app=notion   # Analyze specific app
 *   npm run ai-analyze -- --dry-run      # Preview without writing files
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getAbsolutePath,
  readJSON,
  writeJSON,
  appendLog,
  ensureDir,
  dirExists,
  fileExists,
  getFilesRecursive,
} from './utils/fs-helpers';

const LOG_PATH = 'logs/ai-analysis.log';
const RAW_SCREENS_DIR = 'data/raw_screens';
const APPS_DATA_DIR = 'data/apps';
const PATTERNS_TAXONOMY_PATH = 'config/patterns-taxonomy.json';
const HEURISTICS_PATH = 'config/heuristics.json';

interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Heuristic {
  id: string;
  name: string;
  weight: number;
  description: string;
  scoring_guide: {
    '1': string;
    '3': string;
    '5': string;
  };
}

interface HeuristicScores {
  clarity: number;
  cognitive_load: number;
  visual_hierarchy: number;
  feedback: number;
  accessibility: number;
  conversion_strength: number;
}

interface Screen {
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

interface AnalysisPrompt {
  screenshot_path: string;
  prompt: string;
  context: {
    app_id: string;
    flow_id: string;
    available_patterns: string[];
    heuristics_guide: string;
  };
}

/**
 * Log a message to console and log file
 */
function log(message: string): void {
  console.log(message);
  appendLog(LOG_PATH, message);
}

/**
 * Load pattern taxonomy
 */
function loadPatternTaxonomy(): Pattern[] {
  const taxonomyPath = getAbsolutePath(PATTERNS_TAXONOMY_PATH);
  const taxonomy = readJSON<{ patterns: Pattern[] }>(taxonomyPath);
  return taxonomy.patterns;
}

/**
 * Load heuristics configuration
 */
function loadHeuristics(): Heuristic[] {
  const heuristicsPath = getAbsolutePath(HEURISTICS_PATH);
  const config = readJSON<{ heuristics: Heuristic[] }>(heuristicsPath);
  return config.heuristics;
}

/**
 * Generate the AI analysis prompt for a screenshot
 */
function generateAnalysisPrompt(
  screenshotPath: string,
  appId: string,
  flowId: string,
  patterns: Pattern[],
  heuristics: Heuristic[]
): AnalysisPrompt {
  // Create pattern reference list grouped by category
  const patternsByCategory = new Map<string, Pattern[]>();
  for (const pattern of patterns) {
    if (!patternsByCategory.has(pattern.category)) {
      patternsByCategory.set(pattern.category, []);
    }
    patternsByCategory.get(pattern.category)!.push(pattern);
  }

  let patternReference = '';
  for (const [category, categoryPatterns] of patternsByCategory) {
    patternReference += `\n### ${category}\n`;
    for (const p of categoryPatterns) {
      patternReference += `- **${p.id}**: ${p.name} - ${p.description}\n`;
    }
  }

  // Create heuristics guide
  let heuristicsGuide = '';
  for (const h of heuristics) {
    heuristicsGuide += `\n### ${h.name} (${h.id})\n`;
    heuristicsGuide += `${h.description}\n`;
    heuristicsGuide += `- Score 1: ${h.scoring_guide['1']}\n`;
    heuristicsGuide += `- Score 3: ${h.scoring_guide['3']}\n`;
    heuristicsGuide += `- Score 5: ${h.scoring_guide['5']}\n`;
  }

  const prompt = `# UI/UX Screen Analysis

You are analyzing a screenshot from the app "${appId}" in the "${flowId}" flow.

## Your Task

Analyze this screenshot and provide a structured analysis in JSON format.

## Output Format

Provide your analysis as a JSON object with these fields:

\`\`\`json
{
  "screen_type": "landing|onboarding|signup|login|dashboard|settings|checkout|confirmation|error|empty-state|other",
  "layout_type": "single-column|two-column|grid|cards|list|hero-cta|split-screen|full-bleed|other",
  "primary_user_goal": "What the user is trying to accomplish on this screen",
  "primary_business_goal": "What the business wants users to do",
  "primary_cta_label": "The main call-to-action button text (if any)",
  "secondary_cta_labels": ["Other", "action", "buttons"],
  "navigation_elements": ["Elements", "used", "for", "navigation"],
  "copy_summary": "Brief summary of the key copy/messaging",
  "patterns": ["pattern-id-1", "pattern-id-2"],
  "heuristics": {
    "clarity": 4,
    "cognitive_load": 3,
    "visual_hierarchy": 5,
    "feedback": 3,
    "accessibility": 4,
    "conversion_strength": 4
  },
  "notes": "Additional observations about UX strengths, weaknesses, or interesting choices"
}
\`\`\`

## Pattern Reference

Select patterns from this controlled vocabulary:
${patternReference}

## Heuristics Scoring Guide (1-5 scale)
${heuristicsGuide}

## Important Guidelines

1. Only use pattern IDs from the reference list above
2. Score heuristics on a 1-5 scale based on the scoring guide
3. Be specific about user and business goals
4. Note any accessibility concerns
5. Identify patterns even if partially implemented
6. Focus on observable elements, not assumptions

Now analyze the screenshot and provide your JSON response.`;

  return {
    screenshot_path: screenshotPath,
    prompt,
    context: {
      app_id: appId,
      flow_id: flowId,
      available_patterns: patterns.map(p => p.id),
      heuristics_guide: heuristicsGuide,
    },
  };
}

/**
 * Generate a batch analysis file for all screenshots of an app
 */
function generateBatchAnalysis(
  appId: string,
  screenshots: string[],
  patterns: Pattern[],
  heuristics: Heuristic[]
): void {
  log(`\nGenerating batch analysis for: ${appId}`);

  const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));
  ensureDir(appDataDir);

  const prompts: AnalysisPrompt[] = [];

  for (const screenshotPath of screenshots) {
    // Extract flow from path
    const relativePath = path.relative(
      getAbsolutePath(RAW_SCREENS_DIR),
      screenshotPath
    );
    const parts = relativePath.split(path.sep);
    const flowId = parts.length >= 2 ? parts[1] : 'unknown';

    const prompt = generateAnalysisPrompt(
      screenshotPath,
      appId,
      flowId,
      patterns,
      heuristics
    );
    prompts.push(prompt);
  }

  // Write prompts file for reference
  const promptsPath = path.join(appDataDir, 'ai_analysis_prompts.json');
  writeJSON(promptsPath, {
    app_id: appId,
    generated_at: new Date().toISOString(),
    total_screenshots: screenshots.length,
    prompts: prompts.map(p => ({
      screenshot: p.screenshot_path,
      flow: p.context.flow_id,
    })),
    full_prompt_template: prompts[0]?.prompt || '',
  });

  log(`  ✓ Generated ${promptsPath}`);

  // Generate template screens.json with placeholders
  const templateScreens: Partial<Screen>[] = screenshots.map((screenshotPath, index) => {
    const relativePath = path.relative(
      getAbsolutePath(RAW_SCREENS_DIR),
      screenshotPath
    );
    const parts = relativePath.split(path.sep);
    const flowId = parts.length >= 2 ? parts[1] : 'unknown';

    return {
      screen_id: `${flowId}-${String(index + 1).padStart(2, '0')}`,
      app_id: appId,
      flow_id: flowId,
      step_index: index,
      image_path: path.relative(getAbsolutePath('.'), screenshotPath),
      screen_type: '<<FILL_IN>>',
      layout_type: '<<FILL_IN>>',
      primary_user_goal: '<<FILL_IN>>',
      primary_business_goal: '<<FILL_IN>>',
      primary_cta_label: '<<FILL_IN>>',
      secondary_cta_labels: [],
      navigation_elements: [],
      copy_summary: '<<FILL_IN>>',
      patterns: [],
      heuristics: {
        clarity: 0,
        cognitive_load: 0,
        visual_hierarchy: 0,
        feedback: 0,
        accessibility: 0,
        conversion_strength: 0,
      },
      notes: '<<FILL_IN>>',
    };
  });

  const templatesPath = path.join(appDataDir, 'screens_template.json');
  writeJSON(templatesPath, templateScreens);
  log(`  ✓ Generated ${templatesPath}`);
}

/**
 * Print analysis instructions
 */
function printInstructions(): void {
  console.log(`
================================================================================
                    AI-ASSISTED ANALYSIS WORKFLOW
================================================================================

The prompts and templates have been generated. Here's how to complete the analysis:

OPTION 1: Manual Analysis with AI Chat
--------------------------------------
1. Open the screenshot in an image viewer
2. Copy the prompt from ai_analysis_prompts.json
3. Paste the prompt into Claude or GPT-4V along with the screenshot
4. Copy the JSON response into screens_template.json
5. Verify and adjust the analysis as needed

OPTION 2: Batch Analysis with Claude API (Recommended)
------------------------------------------------------
1. Use the Anthropic API with vision capabilities
2. For each screenshot, send the image + prompt
3. Parse the JSON response and merge into screens.json

Example API call structure:
\`\`\`javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 2000,
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: base64Image } },
      { type: "text", text: promptText }
    ]
  }]
});
\`\`\`

OPTION 3: Interactive Analysis with Claude Code
-----------------------------------------------
Ask Claude Code to:
1. "Analyze the screenshot at data/raw_screens/notion/landing/01-landing.png"
2. Provide the JSON analysis
3. Update the screens.json file directly

After completing analysis:
\`\`\`bash
npm run extract-patterns    # Validate and aggregate patterns
npm run build-atlas         # Generate documentation
\`\`\`

================================================================================
`);
}

/**
 * Get all app IDs from raw_screens directory
 */
function getAppIds(): string[] {
  const screensDir = getAbsolutePath(RAW_SCREENS_DIR);

  if (!dirExists(screensDir)) {
    return [];
  }

  return fs
    .readdirSync(screensDir)
    .filter((item) => {
      const fullPath = path.join(screensDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('UI/UX Research Corpus - AI-Assisted Analysis');
  console.log('='.repeat(60));

  // Parse command line arguments
  const args = process.argv.slice(2);
  const appFilter = args.find(a => a.startsWith('--app='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  // Load configuration
  log('\nLoading configuration...');
  const patterns = loadPatternTaxonomy();
  log(`  Loaded ${patterns.length} patterns`);

  const heuristics = loadHeuristics();
  log(`  Loaded ${heuristics.length} heuristics`);

  // Get apps to process
  let appIds = getAppIds();

  if (appFilter) {
    appIds = appIds.filter(id => id === appFilter);
    if (appIds.length === 0) {
      log(`\nNo screenshots found for app: ${appFilter}`);
      log('Make sure to run `npm run capture` first.');
      return;
    }
  }

  if (appIds.length === 0) {
    log('\nNo apps found in raw_screens directory.');
    log('Run `npm run capture` first to capture screenshots.');
    return;
  }

  log(`\nFound ${appIds.length} app(s) to process`);

  if (dryRun) {
    log('\n[DRY RUN] Would process these apps:');
    appIds.forEach(id => log(`  - ${id}`));
    return;
  }

  // Process each app
  for (const appId of appIds) {
    const appScreensDir = getAbsolutePath(path.join(RAW_SCREENS_DIR, appId));
    const screenshots = getFilesRecursive(appScreensDir, /\.png$/i);

    if (screenshots.length === 0) {
      log(`\n⚠ No screenshots found for ${appId}, skipping`);
      continue;
    }

    log(`\nProcessing ${appId}: ${screenshots.length} screenshot(s)`);
    generateBatchAnalysis(appId, screenshots, patterns, heuristics);
  }

  // Print instructions
  printInstructions();

  console.log('='.repeat(60));
  console.log('AI analysis preparation complete!');
  console.log(`Log file: ${LOG_PATH}`);
  console.log('='.repeat(60) + '\n');
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as aiAssistedAnalysis, generateAnalysisPrompt };
