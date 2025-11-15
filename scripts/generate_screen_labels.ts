#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import {
  getAbsolutePath,
  getFilesRecursive,
  writeJSON,
  readJSON,
  appendLog,
  ensureDir,
  dirExists,
  getDirectoryName,
  slugify,
} from './utils/fs-helpers';

const LOG_PATH = 'logs/screen-generation.log';
const RAW_SCREENS_DIR = 'data/raw_screens';
const APPS_DATA_DIR = 'data/apps';

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

interface Flow {
  flow_id: string;
  name: string;
  primary_user_goal: string;
  business_goal: string;
  entry_point: string;
  exit_point: string;
  screens: string[];
}

/**
 * Log a message to console and log file
 */
function log(message: string): void {
  console.log(message);
  appendLog(LOG_PATH, message);
}

/**
 * Create an empty heuristic scores object
 */
function createEmptyHeuristics(): HeuristicScores {
  return {
    clarity: 0,
    cognitive_load: 0,
    visual_hierarchy: 0,
    feedback: 0,
    accessibility: 0,
    conversion_strength: 0,
  };
}

/**
 * Generate a screen template from screenshot path
 */
function generateScreenTemplate(
  appId: string,
  screenshotPath: string,
  index: number
): Screen {
  // Extract flow name from path
  const relativePath = path.relative(
    getAbsolutePath(RAW_SCREENS_DIR),
    screenshotPath
  );
  const parts = relativePath.split(path.sep);

  // parts[0] = app_id, parts[1] = flow_name, parts[2] = filename
  const flowName = parts.length >= 2 ? parts[1] : 'unknown';
  const filename = parts[parts.length - 1];

  // Generate IDs
  const flowId = slugify(flowName);
  const screenId = `${flowId}-${String(index + 1).padStart(2, '0')}`;

  // Get relative path from project root
  const imagePathRelative = path.relative(
    getAbsolutePath('.'),
    screenshotPath
  );

  return {
    screen_id: screenId,
    app_id: appId,
    flow_id: flowId,
    step_index: index,
    image_path: imagePathRelative,
    screen_type: '',
    layout_type: '',
    primary_user_goal: '',
    primary_business_goal: '',
    primary_cta_label: '',
    secondary_cta_labels: [],
    navigation_elements: [],
    copy_summary: '',
    patterns: [],
    heuristics: createEmptyHeuristics(),
    notes: '',
  };
}

/**
 * Generate flow templates from screens
 */
function generateFlowTemplates(screens: Screen[]): Flow[] {
  const flowMap = new Map<string, Screen[]>();

  // Group screens by flow_id
  for (const screen of screens) {
    if (!flowMap.has(screen.flow_id)) {
      flowMap.set(screen.flow_id, []);
    }
    flowMap.get(screen.flow_id)!.push(screen);
  }

  // Create flow objects
  const flows: Flow[] = [];

  for (const [flowId, flowScreens] of flowMap.entries()) {
    // Sort by step_index
    flowScreens.sort((a, b) => a.step_index - b.step_index);

    // Generate flow name from ID
    const flowName = flowId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    flows.push({
      flow_id: flowId,
      name: flowName,
      primary_user_goal: '',
      business_goal: '',
      entry_point: '',
      exit_point: '',
      screens: flowScreens.map((s) => s.screen_id),
    });
  }

  return flows;
}

/**
 * Process a single app
 */
function processApp(appId: string): void {
  log(`\nProcessing app: ${appId}`);

  const appScreensDir = getAbsolutePath(path.join(RAW_SCREENS_DIR, appId));

  if (!dirExists(appScreensDir)) {
    log(`  ⚠ No screenshots directory found for ${appId}, skipping`);
    return;
  }

  // Find all PNG files
  const screenshots = getFilesRecursive(appScreensDir, /\.png$/i);

  if (screenshots.length === 0) {
    log(`  ⚠ No screenshots found for ${appId}, skipping`);
    return;
  }

  log(`  Found ${screenshots.length} screenshot(s)`);

  // Generate screen templates
  const screens: Screen[] = screenshots.map((screenshotPath, index) =>
    generateScreenTemplate(appId, screenshotPath, index)
  );

  // Generate flow templates
  const flows = generateFlowTemplates(screens);

  // Ensure app data directory exists
  const appDataDir = getAbsolutePath(path.join(APPS_DATA_DIR, appId));
  ensureDir(appDataDir);

  // Write screens.json
  const screensPath = path.join(appDataDir, 'screens.json');
  writeJSON(screensPath, screens);
  log(`  ✓ Generated screens.json (${screens.length} screens)`);

  // Write flows.json
  const flowsPath = path.join(appDataDir, 'flows.json');
  writeJSON(flowsPath, flows);
  log(`  ✓ Generated flows.json (${flows.length} flows)`);

  // Create notes.md if it doesn't exist
  const notesPath = path.join(appDataDir, 'notes.md');
  if (!fs.existsSync(notesPath)) {
    const notesContent = `# ${appId} - UX Analysis Notes\n\n## Overall Impressions\n\n(Add your observations here)\n\n## Key Strengths\n\n## Areas for Improvement\n\n## Pattern Analysis\n\n## Notes\n`;
    fs.writeFileSync(notesPath, notesContent, 'utf-8');
    log(`  ✓ Generated notes.md template`);
  }

  log(`  ✓ Completed ${appId}`);
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
  console.log('UI/UX Research Corpus - Screen Label Generator');
  console.log('='.repeat(60));

  // Get list of apps with screenshots
  const appIds = getAppIds();

  if (appIds.length === 0) {
    log('\nNo apps found in raw_screens directory.');
    log('Run `npm run capture` first to capture screenshots.');
    return;
  }

  log(`\nFound ${appIds.length} app(s) with screenshots`);

  // Process each app
  for (const appId of appIds) {
    processApp(appId);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Screen label generation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review generated files in data/apps/{app_id}/');
  console.log('2. Fill in the empty fields in screens.json and flows.json');
  console.log('3. Add observations to notes.md');
  console.log('4. Run `npm run extract-patterns` to validate and aggregate');
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

export { main as generateScreenLabels };
