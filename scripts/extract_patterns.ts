#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import {
  getAbsolutePath,
  readJSON,
  writeJSON,
  appendLog,
  dirExists,
  fileExists,
} from './utils/fs-helpers';
import {
  HeuristicScores,
  averageHeuristics,
  validateHeuristicScores,
} from './utils/heuristics';

const LOG_PATH = 'logs/pattern-extraction.log';
const MISSING_PATTERNS_LOG = 'logs/missing_patterns.log';
const APPS_DATA_DIR = 'data/apps';
const PATTERNS_TAXONOMY_PATH = 'config/patterns-taxonomy.json';

interface Screen {
  screen_id: string;
  app_id: string;
  flow_id: string;
  patterns: string[];
  heuristics: HeuristicScores;
}

interface Flow {
  flow_id: string;
  name: string;
  screens: string[];
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

interface PatternStats {
  pattern_id: string;
  pattern_name: string;
  frequency: number;
  percentage: number;
  avg_heuristics: HeuristicScores;
  screens: string[];
}

interface FlowPatternStats {
  flow_id: string;
  flow_name: string;
  unique_patterns: string[];
  pattern_combinations: string[][];
}

interface PatternSummary {
  app_id: string;
  total_screens: number;
  patterns: PatternStats[];
  flows: FlowPatternStats[];
}

/**
 * Log a message to console and log file
 */
function log(message: string): void {
  console.log(message);
  appendLog(LOG_PATH, message);
}

/**
 * Log a missing pattern
 */
function logMissingPattern(appId: string, patternId: string): void {
  const message = `App: ${appId}, Missing pattern: ${patternId}`;
  appendLog(MISSING_PATTERNS_LOG, message);
}

/**
 * Load pattern taxonomy
 */
function loadPatternTaxonomy(): PatternTaxonomy {
  const taxonomyPath = getAbsolutePath(PATTERNS_TAXONOMY_PATH);
  return readJSON<PatternTaxonomy>(taxonomyPath);
}

/**
 * Validate that all pattern IDs exist in taxonomy
 */
function validatePatterns(
  appId: string,
  screens: Screen[],
  taxonomy: PatternTaxonomy
): { valid: boolean; missingPatterns: Set<string> } {
  const validPatternIds = new Set(taxonomy.patterns.map((p) => p.id));
  const missingPatterns = new Set<string>();

  for (const screen of screens) {
    for (const patternId of screen.patterns) {
      if (!validPatternIds.has(patternId)) {
        missingPatterns.add(patternId);
        logMissingPattern(appId, patternId);
      }
    }
  }

  return {
    valid: missingPatterns.size === 0,
    missingPatterns,
  };
}

/**
 * Calculate pattern statistics for an app
 */
function calculatePatternStats(
  appId: string,
  screens: Screen[],
  taxonomy: PatternTaxonomy
): PatternStats[] {
  // Create map of pattern ID to screens and heuristics
  const patternMap = new Map<
    string,
    { screens: string[]; heuristics: HeuristicScores[] }
  >();

  for (const screen of screens) {
    for (const patternId of screen.patterns) {
      if (!patternMap.has(patternId)) {
        patternMap.set(patternId, { screens: [], heuristics: [] });
      }

      const entry = patternMap.get(patternId)!;
      entry.screens.push(screen.screen_id);
      entry.heuristics.push(screen.heuristics);
    }
  }

  // Create pattern stats
  const stats: PatternStats[] = [];
  const totalScreens = screens.length;

  for (const [patternId, data] of patternMap.entries()) {
    const pattern = taxonomy.patterns.find((p) => p.id === patternId);

    if (!pattern) {
      // Skip invalid patterns (already logged)
      continue;
    }

    stats.push({
      pattern_id: patternId,
      pattern_name: pattern.name,
      frequency: data.screens.length,
      percentage: Math.round((data.screens.length / totalScreens) * 1000) / 10,
      avg_heuristics: averageHeuristics(data.heuristics),
      screens: data.screens,
    });
  }

  // Sort by frequency (descending)
  stats.sort((a, b) => b.frequency - a.frequency);

  return stats;
}

/**
 * Calculate flow pattern statistics
 */
function calculateFlowPatternStats(
  screens: Screen[],
  flows: Flow[]
): FlowPatternStats[] {
  const flowStats: FlowPatternStats[] = [];

  for (const flow of flows) {
    // Get screens for this flow
    const flowScreens = screens.filter((s) => s.flow_id === flow.flow_id);

    // Collect all unique patterns
    const uniquePatterns = new Set<string>();
    for (const screen of flowScreens) {
      for (const pattern of screen.patterns) {
        uniquePatterns.add(pattern);
      }
    }

    // Find pattern combinations (patterns that appear together on screens)
    const combinationMap = new Map<string, number>();

    for (const screen of flowScreens) {
      const patterns = screen.patterns;

      // Generate all pairs
      for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
          const pair = [patterns[i], patterns[j]].sort().join('|');
          combinationMap.set(pair, (combinationMap.get(pair) || 0) + 1);
        }
      }
    }

    // Get top combinations (appearing on at least 2 screens)
    const topCombinations: string[][] = [];
    for (const [pair, count] of combinationMap.entries()) {
      if (count >= 2) {
        topCombinations.push(pair.split('|'));
      }
    }

    flowStats.push({
      flow_id: flow.flow_id,
      flow_name: flow.name,
      unique_patterns: Array.from(uniquePatterns),
      pattern_combinations: topCombinations,
    });
  }

  return flowStats;
}

/**
 * Process a single app
 */
function processApp(appId: string, taxonomy: PatternTaxonomy): boolean {
  log(`\nProcessing app: ${appId}`);

  const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));

  // Check if screens.json exists
  const screensPath = path.join(appDataDir, 'screens.json');
  if (!fileExists(screensPath)) {
    log(`  ⚠ screens.json not found, skipping`);
    return false;
  }

  // Load screens
  const screens = readJSON<Screen[]>(screensPath);
  log(`  Loaded ${screens.length} screen(s)`);

  // Validate heuristics
  let heuristicsValid = true;
  for (const screen of screens) {
    const errors = validateHeuristicScores(screen.heuristics);
    if (errors.length > 0) {
      log(`  ⚠ Invalid heuristics in screen ${screen.screen_id}:`);
      errors.forEach((err) => log(`    - ${err}`));
      heuristicsValid = false;
    }
  }

  if (!heuristicsValid) {
    log(`  ✗ Heuristic validation failed, skipping pattern extraction`);
    return false;
  }

  // Validate patterns
  const validation = validatePatterns(appId, screens, taxonomy);

  if (!validation.valid) {
    log(`  ⚠ Found ${validation.missingPatterns.size} missing pattern(s):`);
    validation.missingPatterns.forEach((p) => log(`    - ${p}`));
    log(`  See ${MISSING_PATTERNS_LOG} for details`);
  }

  // Calculate pattern statistics
  const patternStats = calculatePatternStats(appId, screens, taxonomy);
  log(`  Calculated stats for ${patternStats.length} pattern(s)`);

  // Load flows if available
  const flowsPath = path.join(appDataDir, 'flows.json');
  let flowStats: FlowPatternStats[] = [];

  if (fileExists(flowsPath)) {
    const flows = readJSON<Flow[]>(flowsPath);
    flowStats = calculateFlowPatternStats(screens, flows);
    log(`  Calculated flow stats for ${flowStats.length} flow(s)`);
  }

  // Create pattern summary
  const summary: PatternSummary = {
    app_id: appId,
    total_screens: screens.length,
    patterns: patternStats,
    flows: flowStats,
  };

  // Write summary
  const summaryPath = path.join(appDataDir, 'patterns_summary.json');
  writeJSON(summaryPath, summary);
  log(`  ✓ Generated patterns_summary.json`);

  return true;
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
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('UI/UX Research Corpus - Pattern Extraction');
  console.log('='.repeat(60));

  // Load pattern taxonomy
  log('\nLoading pattern taxonomy...');
  const taxonomy = loadPatternTaxonomy();
  log(`Loaded ${taxonomy.patterns.length} pattern definitions`);

  // Clear missing patterns log
  const missingPatternsPath = getAbsolutePath(MISSING_PATTERNS_LOG);
  if (fs.existsSync(missingPatternsPath)) {
    fs.unlinkSync(missingPatternsPath);
  }

  // Get list of apps
  const appIds = getAppIds();

  if (appIds.length === 0) {
    log('\nNo apps found in data/apps directory.');
    log('Run `npm run gen-screens` first to generate screen data.');
    return;
  }

  log(`\nFound ${appIds.length} app(s) to process`);

  // Process each app
  let successCount = 0;
  for (const appId of appIds) {
    if (processApp(appId, taxonomy)) {
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Pattern extraction complete! (${successCount}/${appIds.length} apps processed)`);
  console.log('');

  if (fs.existsSync(missingPatternsPath)) {
    console.log('⚠ Some patterns were not found in the taxonomy.');
    console.log(`  See ${MISSING_PATTERNS_LOG} for details.`);
    console.log('  Consider adding them to config/patterns-taxonomy.json');
    console.log('');
  }

  console.log('Next steps:');
  console.log('1. Review patterns_summary.json files in data/apps/{app_id}/');
  console.log('2. Run `npm run build-atlas` to generate the pattern atlas');
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

export { main as extractPatterns };
