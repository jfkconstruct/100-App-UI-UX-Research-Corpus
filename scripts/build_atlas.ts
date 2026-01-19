#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import {
  getAbsolutePath,
  readJSON,
  appendLog,
  dirExists,
  fileExists,
  ensureDir,
} from './utils/fs-helpers';
import {
  HeuristicScores,
  averageHeuristics,
  calculateWeightedScore,
  getLetterGrade,
} from './utils/heuristics';

const LOG_PATH = 'logs/atlas-build.log';
const APPS_DATA_DIR = 'data/apps';
const ATLAS_DIR = 'data/atlas';
const PATTERNS_TAXONOMY_PATH = 'config/patterns-taxonomy.json';

interface AppMetadata {
  app_id: string;
  name: string;
  category: string;
  url: string;
}

interface Screen {
  screen_id: string;
  app_id: string;
  flow_id: string;
  patterns: string[];
  heuristics: HeuristicScores;
  screen_type: string;
  image_path: string;
  notes: string;
}

interface Flow {
  flow_id: string;
  name: string;
  primary_user_goal: string;
  business_goal: string;
  entry_point: string;
  exit_point: string;
}

interface PatternStats {
  pattern_id: string;
  pattern_name: string;
  frequency: number;
  percentage: number;
  avg_heuristics: HeuristicScores;
  screens: string[];
}

interface PatternSummary {
  app_id: string;
  total_screens: number;
  patterns: PatternStats[];
}

interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface PatternTaxonomy {
  patterns: Pattern[];
}

interface GlobalPatternData {
  pattern_id: string;
  pattern_name: string;
  pattern_definition: Pattern;
  apps: string[];
  total_uses: number;
  avg_heuristics: HeuristicScores;
  examples: Array<{
    app_id: string;
    app_name: string;
    screen_id: string;
    image_path: string;
    heuristics: HeuristicScores;
  }>;
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
function loadPatternTaxonomy(): PatternTaxonomy {
  const taxonomyPath = getAbsolutePath(PATTERNS_TAXONOMY_PATH);
  return readJSON<PatternTaxonomy>(taxonomyPath);
}

/**
 * Get all app IDs from apps data directory
 */
function getAppIds(): string[] {
  const appsDir = getAbsolutePath(APPS_DATA_DIR);

  if (!dirExists(appsDir)) {
    return [];
  }

  return fs
    .readdirSync(appsDir)
    .filter((item) => {
      const fullPath = path.join(appsDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Aggregate pattern data across all apps
 */
function aggregatePatternData(
  appIds: string[],
  taxonomy: PatternTaxonomy
): Map<string, GlobalPatternData> {
  const patternDataMap = new Map<string, GlobalPatternData>();

  // Initialize with all patterns from taxonomy
  for (const pattern of taxonomy.patterns) {
    patternDataMap.set(pattern.id, {
      pattern_id: pattern.id,
      pattern_name: pattern.name,
      pattern_definition: pattern,
      apps: [],
      total_uses: 0,
      avg_heuristics: {
        clarity: 0,
        cognitive_load: 0,
        visual_hierarchy: 0,
        feedback: 0,
        accessibility: 0,
        conversion_strength: 0,
      },
      examples: [],
    });
  }

  // Aggregate data from each app
  for (const appId of appIds) {
    const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));

    // Load app metadata
    const metaPath = path.join(appDataDir, 'meta.json');
    if (!fileExists(metaPath)) continue;
    const meta = readJSON<AppMetadata>(metaPath);

    // Load screens
    const screensPath = path.join(appDataDir, 'screens.json');
    if (!fileExists(screensPath)) continue;
    const screens = readJSON<Screen[]>(screensPath);

    // Load pattern summary
    const summaryPath = path.join(appDataDir, 'patterns_summary.json');
    if (!fileExists(summaryPath)) continue;
    const summary = readJSON<PatternSummary>(summaryPath);

    // Process each pattern in this app
    for (const patternStats of summary.patterns) {
      const globalData = patternDataMap.get(patternStats.pattern_id);
      if (!globalData) continue;

      // Add app to list if not already present
      if (!globalData.apps.includes(appId)) {
        globalData.apps.push(appId);
      }

      // Add to total uses
      globalData.total_uses += patternStats.frequency;

      // Find best example screen (highest weighted score)
      let bestScreen: Screen | null = null;
      let bestScore = 0;

      for (const screenId of patternStats.screens) {
        const screen = screens.find((s) => s.screen_id === screenId);
        if (!screen) continue;

        const score = calculateWeightedScore(screen.heuristics);
        if (score > bestScore) {
          bestScore = score;
          bestScreen = screen;
        }
      }

      // Add example
      if (bestScreen) {
        globalData.examples.push({
          app_id: appId,
          app_name: meta.name,
          screen_id: bestScreen.screen_id,
          image_path: bestScreen.image_path,
          heuristics: bestScreen.heuristics,
        });
      }
    }
  }

  // Calculate average heuristics for each pattern
  for (const [_, data] of patternDataMap) {
    if (data.examples.length > 0) {
      const heuristics = data.examples.map((ex) => ex.heuristics);
      data.avg_heuristics = averageHeuristics(heuristics);
    }
  }

  return patternDataMap;
}

/**
 * Build Pattern Atlas markdown
 */
function buildPatternAtlas(
  patternData: Map<string, GlobalPatternData>
): string {
  let md = '# UI/UX Pattern Atlas\n\n';
  md += `*Generated: ${new Date().toLocaleDateString()}*\n\n`;
  md += '## Overview\n\n';
  md += 'This atlas catalogs UI/UX patterns found across analyzed applications, ';
  md += 'with usage statistics, quality metrics, and examples.\n\n';
  md += '---\n\n';

  // Group patterns by category
  const patternsByCategory = new Map<string, GlobalPatternData[]>();

  for (const [_, data] of patternData) {
    const category = data.pattern_definition.category;
    if (!patternsByCategory.has(category)) {
      patternsByCategory.set(category, []);
    }
    patternsByCategory.get(category)!.push(data);
  }

  // Table of contents
  md += '## Table of Contents\n\n';
  for (const [category, _] of patternsByCategory) {
    const anchor = category.toLowerCase().replace(/\s+/g, '-');
    md += `- [${category.charAt(0).toUpperCase() + category.slice(1)}](#${anchor})\n`;
  }
  md += '\n---\n\n';

  // Write each category
  for (const [category, patterns] of patternsByCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    // Sort by total uses
    patterns.sort((a, b) => b.total_uses - a.total_uses);

    for (const pattern of patterns) {
      if (pattern.total_uses === 0) continue; // Skip unused patterns

      md += `### ${pattern.pattern_name}\n\n`;
      md += `**Pattern ID:** \`${pattern.pattern_id}\`\n\n`;
      md += `**Description:** ${pattern.pattern_definition.description}\n\n`;

      md += '**Usage Statistics:**\n';
      md += `- Used in ${pattern.apps.length} app(s)\n`;
      md += `- Total occurrences: ${pattern.total_uses}\n`;
      md += `- Apps: ${pattern.apps.join(', ')}\n\n`;

      md += '**Average Quality Scores:**\n';
      const scores = pattern.avg_heuristics;
      const overallScore = calculateWeightedScore(scores);
      const grade = getLetterGrade(overallScore);

      md += `- Overall: ${overallScore.toFixed(1)}/5.0 (Grade: ${grade})\n`;
      md += `- Clarity: ${scores.clarity.toFixed(1)}/5.0\n`;
      md += `- Cognitive Load: ${scores.cognitive_load.toFixed(1)}/5.0\n`;
      md += `- Visual Hierarchy: ${scores.visual_hierarchy.toFixed(1)}/5.0\n`;
      md += `- Feedback: ${scores.feedback.toFixed(1)}/5.0\n`;
      md += `- Accessibility: ${scores.accessibility.toFixed(1)}/5.0\n`;
      md += `- Conversion Strength: ${scores.conversion_strength.toFixed(1)}/5.0\n\n`;

      if (pattern.examples.length > 0) {
        md += '**Examples:**\n\n';

        // Show top 3 examples
        const topExamples = pattern.examples
          .sort((a, b) => calculateWeightedScore(b.heuristics) - calculateWeightedScore(a.heuristics))
          .slice(0, 3);

        for (const example of topExamples) {
          const exampleScore = calculateWeightedScore(example.heuristics);
          md += `- **${example.app_name}** (${example.screen_id}) - Score: ${exampleScore.toFixed(1)}/5.0\n`;
          md += `  - Image: \`${example.image_path}\`\n`;
        }
        md += '\n';
      }

      md += '**When It Works:**\n';
      if (overallScore >= 4.0) {
        md += `- This pattern consistently scores well (${overallScore.toFixed(1)}/5.0 average)\n`;
      }
      if (scores.clarity >= 4.0) {
        md += '- Provides excellent clarity for users\n';
      }
      if (scores.cognitive_load >= 4.0) {
        md += '- Reduces cognitive load effectively\n';
      }
      if (scores.conversion_strength >= 4.0) {
        md += '- Strong conversion and engagement driver\n';
      }
      md += '\n';

      md += '**When to Avoid:**\n';
      if (scores.accessibility < 3.5) {
        md += '- May have accessibility concerns\n';
      }
      if (scores.cognitive_load < 3.5) {
        md += '- Could increase cognitive load for users\n';
      }
      if (overallScore < 3.0) {
        md += '- Generally scores below average, use with caution\n';
      }
      md += '\n---\n\n';
    }
  }

  return md;
}

/**
 * Build Flow Atlas markdown
 */
function buildFlowAtlas(appIds: string[]): string {
  let md = '# UI/UX Flow Atlas\n\n';
  md += `*Generated: ${new Date().toLocaleDateString()}*\n\n`;
  md += '## Overview\n\n';
  md += 'This atlas compares common user flows across applications.\n\n';
  md += '---\n\n';

  // Group flows by type across apps
  const flowsByType = new Map<string, Array<{ appId: string; appName: string; flow: Flow }>>();

  for (const appId of appIds) {
    const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));

    // Load metadata
    const metaPath = path.join(appDataDir, 'meta.json');
    if (!fileExists(metaPath)) continue;
    const meta = readJSON<AppMetadata>(metaPath);

    // Load flows
    const flowsPath = path.join(appDataDir, 'flows.json');
    if (!fileExists(flowsPath)) continue;
    const flows = readJSON<Flow[]>(flowsPath);

    for (const flow of flows) {
      if (!flowsByType.has(flow.flow_id)) {
        flowsByType.set(flow.flow_id, []);
      }
      flowsByType.get(flow.flow_id)!.push({
        appId,
        appName: meta.name,
        flow,
      });
    }
  }

  // Write each flow type
  for (const [flowType, instances] of flowsByType) {
    if (instances.length === 0) continue;

    md += `## ${instances[0].flow.name}\n\n`;
    md += `**Flow Type:** \`${flowType}\`\n\n`;
    md += `**Found in ${instances.length} app(s):** ${instances.map(i => i.appName).join(', ')}\n\n`;

    md += '### Implementations\n\n';

    for (const instance of instances) {
      md += `#### ${instance.appName}\n\n`;
      md += `**User Goal:** ${instance.flow.primary_user_goal}\n\n`;
      md += `**Business Goal:** ${instance.flow.business_goal}\n\n`;
      md += `**Path:** ${instance.flow.entry_point} → ${instance.flow.exit_point}\n\n`;
    }

    md += '---\n\n';
  }

  return md;
}

/**
 * Build Heuristics Report markdown
 */
function buildHeuristicsReport(
  appIds: string[],
  patternData: Map<string, GlobalPatternData>
): string {
  let md = '# UI/UX Heuristics Report\n\n';
  md += `*Generated: ${new Date().toLocaleDateString()}*\n\n`;
  md += '## Overview\n\n';
  md += 'Quality insights and heuristic analysis across the corpus.\n\n';
  md += '---\n\n';

  // Collect all screens with scores
  const allScreens: Array<{
    appId: string;
    appName: string;
    screen: Screen;
    overallScore: number;
  }> = [];

  for (const appId of appIds) {
    const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));

    const metaPath = path.join(appDataDir, 'meta.json');
    if (!fileExists(metaPath)) continue;
    const meta = readJSON<AppMetadata>(metaPath);

    const screensPath = path.join(appDataDir, 'screens.json');
    if (!fileExists(screensPath)) continue;
    const screens = readJSON<Screen[]>(screensPath);

    for (const screen of screens) {
      allScreens.push({
        appId,
        appName: meta.name,
        screen,
        overallScore: calculateWeightedScore(screen.heuristics),
      });
    }
  }

  // Top 10 overall screens
  md += '## Top 10 Best-Scoring Screens\n\n';
  const topScreens = allScreens
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10);

  md += '| Rank | App | Screen | Score | Image |\n';
  md += '|------|-----|--------|-------|-------|\n';

  topScreens.forEach((item, index) => {
    md += `| ${index + 1} | ${item.appName} | ${item.screen.screen_id} | ${item.overallScore.toFixed(1)}/5.0 | \`${item.screen.image_path}\` |\n`;
  });
  md += '\n';

  // Top patterns by heuristic
  md += '## Patterns by Quality\n\n';

  md += '### Highest Clarity\n\n';
  const topClarity = Array.from(patternData.values())
    .filter(p => p.total_uses > 0)
    .sort((a, b) => b.avg_heuristics.clarity - a.avg_heuristics.clarity)
    .slice(0, 5);

  for (const pattern of topClarity) {
    md += `- **${pattern.pattern_name}**: ${pattern.avg_heuristics.clarity.toFixed(1)}/5.0\n`;
  }
  md += '\n';

  md += '### Lowest Cognitive Load (Easiest to Process)\n\n';
  const topCognitiveLoad = Array.from(patternData.values())
    .filter(p => p.total_uses > 0)
    .sort((a, b) => b.avg_heuristics.cognitive_load - a.avg_heuristics.cognitive_load)
    .slice(0, 5);

  for (const pattern of topCognitiveLoad) {
    md += `- **${pattern.pattern_name}**: ${pattern.avg_heuristics.cognitive_load.toFixed(1)}/5.0\n`;
  }
  md += '\n';

  md += '### Highest Conversion Strength\n\n';
  const topConversion = Array.from(patternData.values())
    .filter(p => p.total_uses > 0)
    .sort((a, b) => b.avg_heuristics.conversion_strength - a.avg_heuristics.conversion_strength)
    .slice(0, 5);

  for (const pattern of topConversion) {
    md += `- **${pattern.pattern_name}**: ${pattern.avg_heuristics.conversion_strength.toFixed(1)}/5.0\n`;
  }
  md += '\n';

  // Corpus statistics
  md += '## Corpus Statistics\n\n';
  md += `- **Total Apps:** ${appIds.length}\n`;
  md += `- **Total Screens:** ${allScreens.length}\n`;
  md += `- **Total Patterns in Use:** ${Array.from(patternData.values()).filter(p => p.total_uses > 0).length}\n`;
  md += `- **Average Screen Score:** ${(allScreens.reduce((sum, s) => sum + s.overallScore, 0) / allScreens.length).toFixed(1)}/5.0\n`;

  md += '\n---\n\n';

  return md;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('UI/UX Research Corpus - Atlas Builder');
  console.log('='.repeat(60));

  // Ensure atlas directory exists
  ensureDir(getAbsolutePath(ATLAS_DIR));

  // Load pattern taxonomy
  log('\nLoading pattern taxonomy...');
  const taxonomy = loadPatternTaxonomy();
  log(`Loaded ${taxonomy.patterns.length} pattern definitions`);

  // Get list of apps
  const appIds = getAppIds();

  if (appIds.length === 0) {
    log('\nNo apps found in data/apps directory.');
    return;
  }

  log(`\nFound ${appIds.length} app(s) to aggregate`);

  // Aggregate pattern data
  log('\nAggregating pattern data across apps...');
  const patternData = aggregatePatternData(appIds, taxonomy);
  log(`Aggregated data for ${patternData.size} patterns`);

  // Build Pattern Atlas
  log('\nBuilding Pattern Atlas...');
  const patternAtlas = buildPatternAtlas(patternData);
  const patternAtlasPath = getAbsolutePath(path.join(ATLAS_DIR, 'pattern-atlas.md'));
  fs.writeFileSync(patternAtlasPath, patternAtlas, 'utf-8');
  log(`✓ Generated ${patternAtlasPath}`);

  // Build Flow Atlas
  log('\nBuilding Flow Atlas...');
  const flowAtlas = buildFlowAtlas(appIds);
  const flowAtlasPath = getAbsolutePath(path.join(ATLAS_DIR, 'flow-atlas.md'));
  fs.writeFileSync(flowAtlasPath, flowAtlas, 'utf-8');
  log(`✓ Generated ${flowAtlasPath}`);

  // Build Heuristics Report
  log('\nBuilding Heuristics Report...');
  const heuristicsReport = buildHeuristicsReport(appIds, patternData);
  const heuristicsReportPath = getAbsolutePath(path.join(ATLAS_DIR, 'heuristics-report.md'));
  fs.writeFileSync(heuristicsReportPath, heuristicsReport, 'utf-8');
  log(`✓ Generated ${heuristicsReportPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('Atlas generation complete!');
  console.log('');
  console.log('Generated files:');
  console.log(`- ${ATLAS_DIR}/pattern-atlas.md`);
  console.log(`- ${ATLAS_DIR}/flow-atlas.md`);
  console.log(`- ${ATLAS_DIR}/heuristics-report.md`);
  console.log('');
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

export { main as buildAtlas };
