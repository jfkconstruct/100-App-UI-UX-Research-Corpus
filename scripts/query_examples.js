#!/usr/bin/env node

/**
 * UI/UX Research Corpus - Query Examples
 *
 * Practical queries for Product Managers looking to improve their products.
 * Run with: node scripts/query_examples.js
 */

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(__dirname, '..', 'data', 'apps');
const TAXONOMY_PATH = path.join(__dirname, '..', 'config', 'patterns-taxonomy.json');

// Load all app data
function loadAllApps() {
  const apps = {};
  const appDirs = fs.readdirSync(APPS_DIR).filter(d =>
    fs.statSync(path.join(APPS_DIR, d)).isDirectory()
  );

  for (const appId of appDirs) {
    const appPath = path.join(APPS_DIR, appId);
    apps[appId] = {
      meta: loadJSON(path.join(appPath, 'meta.json')),
      screens: loadJSON(path.join(appPath, 'screens.json')),
      flows: loadJSON(path.join(appPath, 'flows.json')),
      patterns: loadJSON(path.join(appPath, 'patterns_summary.json')),
      notes: loadText(path.join(appPath, 'notes.md'))
    };
  }
  return apps;
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function loadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
}

// ============================================================================
// QUERY 1: "How do top apps handle onboarding?"
// ============================================================================
function queryOnboardingPatterns(apps) {
  console.log('\n' + '='.repeat(70));
  console.log('QUERY: How do top apps handle onboarding?');
  console.log('='.repeat(70));

  const onboardingScreens = [];

  for (const [appId, app] of Object.entries(apps)) {
    if (!app.screens) continue;

    const screens = app.screens.filter(s =>
      s.flow_id?.includes('onboarding') ||
      s.screen_type === 'onboarding' ||
      s.screen_type === 'signup'
    );

    screens.forEach(s => {
      onboardingScreens.push({
        app: appId,
        screen: s.screen_id,
        patterns: s.patterns || [],
        clarity: s.heuristics?.clarity || 0,
        conversion: s.heuristics?.conversion_strength || 0,
        notes: s.notes?.substring(0, 100) + '...'
      });
    });
  }

  // Sort by conversion strength
  onboardingScreens.sort((a, b) => b.conversion - a.conversion);

  console.log('\nTop 10 Onboarding Screens by Conversion Strength:\n');
  console.log('| App | Screen | Conversion | Clarity | Key Patterns |');
  console.log('|-----|--------|------------|---------|--------------|');

  onboardingScreens.slice(0, 10).forEach(s => {
    const patterns = s.patterns.slice(0, 3).join(', ');
    console.log(`| ${s.app} | ${s.screen} | ${s.conversion}/5 | ${s.clarity}/5 | ${patterns} |`);
  });

  // Aggregate most common onboarding patterns
  const patternCounts = {};
  onboardingScreens.forEach(s => {
    s.patterns.forEach(p => {
      patternCounts[p] = (patternCounts[p] || 0) + 1;
    });
  });

  const sortedPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\nMost Common Onboarding Patterns:\n');
  sortedPatterns.forEach(([pattern, count]) => {
    console.log(`  ${count}x - ${pattern}`);
  });
}

// ============================================================================
// QUERY 2: "What patterns drive the highest conversion?"
// ============================================================================
function queryHighConversionPatterns(apps) {
  console.log('\n' + '='.repeat(70));
  console.log('QUERY: What patterns correlate with highest conversion scores?');
  console.log('='.repeat(70));

  const patternScores = {};

  for (const [appId, app] of Object.entries(apps)) {
    if (!app.screens) continue;

    app.screens.forEach(screen => {
      const conversion = screen.heuristics?.conversion_strength || 0;
      (screen.patterns || []).forEach(pattern => {
        if (!patternScores[pattern]) {
          patternScores[pattern] = { total: 0, count: 0, screens: [] };
        }
        patternScores[pattern].total += conversion;
        patternScores[pattern].count += 1;
        if (conversion >= 4.5) {
          patternScores[pattern].screens.push(`${appId}/${screen.screen_id}`);
        }
      });
    });
  }

  // Calculate averages and sort
  const ranked = Object.entries(patternScores)
    .map(([pattern, data]) => ({
      pattern,
      avgConversion: (data.total / data.count).toFixed(2),
      usage: data.count,
      topScreens: data.screens.slice(0, 3)
    }))
    .filter(p => p.usage >= 3) // At least 3 uses
    .sort((a, b) => b.avgConversion - a.avgConversion);

  console.log('\nPatterns with Highest Average Conversion (min 3 uses):\n');
  console.log('| Pattern | Avg Conversion | Usage | Example Screens |');
  console.log('|---------|----------------|-------|-----------------|');

  ranked.slice(0, 15).forEach(p => {
    console.log(`| ${p.pattern} | ${p.avgConversion}/5 | ${p.usage}x | ${p.topScreens.join(', ') || '-'} |`);
  });
}

// ============================================================================
// QUERY 3: "How do competitors handle [specific flow]?"
// ============================================================================
function queryFlowComparison(apps, flowKeyword = 'pricing') {
  console.log('\n' + '='.repeat(70));
  console.log(`QUERY: How do apps handle "${flowKeyword}" flows?`);
  console.log('='.repeat(70));

  const matches = [];

  for (const [appId, app] of Object.entries(apps)) {
    if (!app.screens) continue;

    const screens = app.screens.filter(s =>
      s.flow_id?.toLowerCase().includes(flowKeyword) ||
      s.screen_type?.toLowerCase().includes(flowKeyword) ||
      s.screen_id?.toLowerCase().includes(flowKeyword)
    );

    screens.forEach(s => {
      matches.push({
        app: appId,
        screen: s.screen_id,
        type: s.screen_type,
        userGoal: s.primary_user_goal,
        bizGoal: s.primary_business_goal,
        primaryCTA: s.primary_cta_label,
        patterns: s.patterns || [],
        conversion: s.heuristics?.conversion_strength || 0
      });
    });
  }

  if (matches.length === 0) {
    console.log(`\nNo screens found matching "${flowKeyword}"`);
    return;
  }

  console.log(`\nFound ${matches.length} screens across ${new Set(matches.map(m => m.app)).size} apps:\n`);

  matches.sort((a, b) => b.conversion - a.conversion);

  matches.forEach(m => {
    console.log(`\n${m.app.toUpperCase()} - ${m.screen}`);
    console.log(`  User Goal: ${m.userGoal}`);
    console.log(`  Business Goal: ${m.bizGoal}`);
    console.log(`  Primary CTA: "${m.primaryCTA}"`);
    console.log(`  Patterns: ${m.patterns.slice(0, 5).join(', ')}`);
    console.log(`  Conversion Score: ${m.conversion}/5`);
  });
}

// ============================================================================
// QUERY 4: "What can I learn from [specific app]?"
// ============================================================================
function queryAppDeepDive(apps, appId) {
  console.log('\n' + '='.repeat(70));
  console.log(`QUERY: Deep dive into ${appId}`);
  console.log('='.repeat(70));

  const app = apps[appId];
  if (!app) {
    console.log(`\nApp "${appId}" not found. Available: ${Object.keys(apps).join(', ')}`);
    return;
  }

  console.log('\n## App Overview\n');
  if (app.meta) {
    console.log(`Category: ${app.meta.category}`);
    console.log(`Platforms: ${app.meta.platforms?.join(', ')}`);
    console.log(`URL: ${app.meta.url}`);
  }

  console.log('\n## Key Strengths (from notes)\n');
  // Extract strengths section from notes
  const strengthsMatch = app.notes?.match(/## Key Strengths([\s\S]*?)## /);
  if (strengthsMatch) {
    console.log(strengthsMatch[1].trim().substring(0, 500) + '...');
  }

  console.log('\n## Screen Summary\n');
  if (app.screens) {
    console.log(`Total Screens: ${app.screens.length}`);

    // Average heuristics
    const avgHeuristics = {
      clarity: 0, cognitive_load: 0, visual_hierarchy: 0,
      feedback: 0, accessibility: 0, conversion_strength: 0
    };

    app.screens.forEach(s => {
      if (s.heuristics) {
        Object.keys(avgHeuristics).forEach(k => {
          avgHeuristics[k] += s.heuristics[k] || 0;
        });
      }
    });

    console.log('\nAverage Heuristic Scores:');
    Object.entries(avgHeuristics).forEach(([k, v]) => {
      console.log(`  ${k}: ${(v / app.screens.length).toFixed(1)}/5`);
    });
  }

  console.log('\n## Top Patterns Used\n');
  if (app.patterns?.pattern_stats) {
    const topPatterns = app.patterns.pattern_stats
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    topPatterns.forEach(p => {
      console.log(`  ${p.frequency}x - ${p.pattern_id}`);
    });
  }

  console.log('\n## Flows\n');
  if (app.flows) {
    app.flows.forEach(f => {
      console.log(`- ${f.name}: ${f.primary_user_goal}`);
    });
  }
}

// ============================================================================
// QUERY 5: "Find apps similar to mine"
// ============================================================================
function queryByCategory(apps, category) {
  console.log('\n' + '='.repeat(70));
  console.log(`QUERY: Apps in category "${category}"`);
  console.log('='.repeat(70));

  const matches = [];

  for (const [appId, app] of Object.entries(apps)) {
    if (!app.meta) continue;

    const appCategory = app.meta.category?.toLowerCase() || '';
    const subcategories = app.meta.subcategories?.map(s => s.toLowerCase()) || [];

    if (appCategory.includes(category.toLowerCase()) ||
        subcategories.some(s => s.includes(category.toLowerCase()))) {
      matches.push({
        id: appId,
        name: app.meta.name,
        category: app.meta.category,
        screens: app.screens?.length || 0,
        why: app.meta.why_interesting?.slice(0, 2) || []
      });
    }
  }

  if (matches.length === 0) {
    console.log(`\nNo apps found in category "${category}"`);
    console.log('\nAvailable categories:');
    const cats = new Set();
    Object.values(apps).forEach(a => {
      if (a.meta?.category) cats.add(a.meta.category);
    });
    console.log([...cats].join(', '));
    return;
  }

  console.log(`\nFound ${matches.length} apps:\n`);
  matches.forEach(m => {
    console.log(`\n${m.name} (${m.id})`);
    console.log(`  Category: ${m.category}`);
    console.log(`  Screens analyzed: ${m.screens}`);
    console.log(`  Why interesting:`);
    m.why.forEach(w => console.log(`    - ${w}`));
  });
}

// ============================================================================
// QUERY 6: "Show me the best implementations of [pattern]"
// ============================================================================
function queryPatternExamples(apps, patternId) {
  console.log('\n' + '='.repeat(70));
  console.log(`QUERY: Best implementations of "${patternId}"`);
  console.log('='.repeat(70));

  const examples = [];

  for (const [appId, app] of Object.entries(apps)) {
    if (!app.screens) continue;

    app.screens.forEach(screen => {
      if (screen.patterns?.includes(patternId)) {
        const avgScore = screen.heuristics ?
          (Object.values(screen.heuristics).reduce((a, b) => a + b, 0) / 6).toFixed(1) : 0;

        examples.push({
          app: appId,
          screen: screen.screen_id,
          avgScore,
          clarity: screen.heuristics?.clarity || 0,
          notes: screen.notes?.substring(0, 150)
        });
      }
    });
  }

  if (examples.length === 0) {
    console.log(`\nPattern "${patternId}" not found in any screens.`);
    return;
  }

  examples.sort((a, b) => b.avgScore - a.avgScore);

  console.log(`\nFound ${examples.length} implementations:\n`);
  console.log('| Rank | App | Screen | Avg Score | Notes |');
  console.log('|------|-----|--------|-----------|-------|');

  examples.slice(0, 10).forEach((e, i) => {
    const notes = e.notes?.replace(/\n/g, ' ').substring(0, 50) || '';
    console.log(`| ${i + 1} | ${e.app} | ${e.screen} | ${e.avgScore}/5 | ${notes}... |`);
  });
}

// ============================================================================
// MAIN - Run example queries
// ============================================================================
function main() {
  console.log('Loading corpus data...');
  const apps = loadAllApps();
  console.log(`Loaded ${Object.keys(apps).length} apps\n`);

  const args = process.argv.slice(2);
  const query = args[0] || 'all';
  const param = args[1];

  switch (query) {
    case 'onboarding':
      queryOnboardingPatterns(apps);
      break;
    case 'conversion':
      queryHighConversionPatterns(apps);
      break;
    case 'flow':
      queryFlowComparison(apps, param || 'pricing');
      break;
    case 'app':
      queryAppDeepDive(apps, param || 'notion');
      break;
    case 'category':
      queryByCategory(apps, param || 'productivity');
      break;
    case 'pattern':
      queryPatternExamples(apps, param || 'single-primary-cta');
      break;
    case 'all':
    default:
      // Run all example queries
      queryOnboardingPatterns(apps);
      queryHighConversionPatterns(apps);
      queryFlowComparison(apps, 'pricing');
      queryPatternExamples(apps, 'progressive-disclosure');
      queryByCategory(apps, 'productivity');
      queryAppDeepDive(apps, 'duolingo');
  }

  console.log('\n' + '='.repeat(70));
  console.log('Query Examples Complete');
  console.log('='.repeat(70));
  console.log(`
Usage:
  node scripts/query_examples.js onboarding          # Onboarding best practices
  node scripts/query_examples.js conversion          # High-conversion patterns
  node scripts/query_examples.js flow checkout       # Compare checkout flows
  node scripts/query_examples.js flow onboarding     # Compare onboarding flows
  node scripts/query_examples.js app stripe          # Deep dive into Stripe
  node scripts/query_examples.js category finance    # Apps in finance category
  node scripts/query_examples.js pattern social-proof # Best social proof examples
  node scripts/query_examples.js all                 # Run all example queries
`);
}

main();
