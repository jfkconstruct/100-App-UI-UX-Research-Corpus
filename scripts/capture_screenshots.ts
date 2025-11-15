#!/usr/bin/env ts-node

import { chromium, Browser, Page } from 'playwright';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { ensureDir, getAbsolutePath, appendLog, slugify } from './utils/fs-helpers';

interface AppSeed {
  app_id: string;
  name: string;
  category: string;
  platforms: string[];
  url: string;
  notes?: string[];
}

const LOG_PATH = 'logs/screenshot-capture.log';
const APPS_SEED_PATH = 'data/apps/apps_seed.yaml';
const RAW_SCREENS_DIR = 'data/raw_screens';

const SCREENSHOT_CONFIG = {
  viewport: {
    width: 1280,
    height: 800,
  },
  fullPage: false,
  timeout: 30000,
  waitBeforeCapture: 2000,
  scrollSteps: 2,
};

/**
 * Log a message to console and log file
 */
function log(message: string): void {
  console.log(message);
  appendLog(LOG_PATH, message);
}

/**
 * Load apps from seed file
 */
function loadApps(): AppSeed[] {
  const seedPath = getAbsolutePath(APPS_SEED_PATH);

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Apps seed file not found: ${seedPath}`);
  }

  const content = fs.readFileSync(seedPath, 'utf-8');
  const apps = yaml.load(content) as AppSeed[];

  if (!Array.isArray(apps)) {
    throw new Error('Invalid apps seed file format');
  }

  return apps;
}

/**
 * Wait for page to be stable (network idle)
 */
async function waitForStable(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', {
      timeout: SCREENSHOT_CONFIG.timeout
    });
  } catch (error) {
    // Continue if timeout - some apps have long-polling connections
    log('  Warning: Network did not become idle, continuing anyway');
  }
}

/**
 * Capture screenshot with error handling
 */
async function captureScreenshot(
  page: Page,
  outputPath: string,
  description: string
): Promise<boolean> {
  try {
    await page.screenshot({
      path: outputPath,
      fullPage: SCREENSHOT_CONFIG.fullPage,
    });
    log(`  ✓ Captured: ${description}`);
    return true;
  } catch (error) {
    log(`  ✗ Failed to capture ${description}: ${error}`);
    return false;
  }
}

/**
 * Capture screenshots for a single app
 */
async function captureAppScreenshots(
  browser: Browser,
  app: AppSeed
): Promise<void> {
  log(`\nProcessing: ${app.name} (${app.app_id})`);
  log(`  URL: ${app.url}`);

  // Create output directory
  const appDir = getAbsolutePath(path.join(RAW_SCREENS_DIR, app.app_id, 'landing'));
  ensureDir(appDir);

  // Create new page
  const page = await browser.newPage({
    viewport: SCREENSHOT_CONFIG.viewport,
  });

  try {
    // Navigate to URL
    log(`  Navigating to ${app.url}...`);
    await page.goto(app.url, {
      waitUntil: 'domcontentloaded',
      timeout: SCREENSHOT_CONFIG.timeout,
    });

    // Wait for initial page to stabilize
    await waitForStable(page);
    await page.waitForTimeout(SCREENSHOT_CONFIG.waitBeforeCapture);

    // Capture initial view
    const initialPath = path.join(appDir, '01-landing.png');
    await captureScreenshot(page, initialPath, 'Initial landing page');

    // Scroll and capture additional views
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = SCREENSHOT_CONFIG.viewport.height;

    if (scrollHeight > viewportHeight * 1.5) {
      // Page has enough content to scroll
      for (let i = 1; i <= SCREENSHOT_CONFIG.scrollSteps; i++) {
        const scrollPosition = (scrollHeight / (SCREENSHOT_CONFIG.scrollSteps + 1)) * i;

        await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
        await page.waitForTimeout(1000);

        const scrolledPath = path.join(appDir, `0${i + 1}-scrolled-${i}.png`);
        await captureScreenshot(
          page,
          scrolledPath,
          `Scrolled view ${i}`
        );
      }
    }

    // Try to capture hero CTA click (if obvious button exists)
    try {
      const ctaSelectors = [
        'a[href*="signup"]',
        'a[href*="sign-up"]',
        'a[href*="get-started"]',
        'button:has-text("Get Started")',
        'button:has-text("Sign Up")',
        'button:has-text("Try")',
      ];

      let ctaFound = false;
      for (const selector of ctaSelectors) {
        const cta = await page.$(selector);
        if (cta && !ctaFound) {
          log(`  Found CTA with selector: ${selector}`);

          // Create signup directory
          const signupDir = getAbsolutePath(
            path.join(RAW_SCREENS_DIR, app.app_id, 'signup')
          );
          ensureDir(signupDir);

          await cta.click();
          await page.waitForTimeout(SCREENSHOT_CONFIG.waitBeforeCapture);
          await waitForStable(page);

          const signupPath = path.join(signupDir, '01-signup-page.png');
          await captureScreenshot(page, signupPath, 'Signup/CTA page');

          ctaFound = true;
          break;
        }
      }

      if (!ctaFound) {
        log('  No obvious CTA found for signup capture');
      }
    } catch (error) {
      log(`  Could not capture CTA flow: ${error}`);
    }

  } catch (error) {
    log(`  Error processing ${app.name}: ${error}`);
  } finally {
    await page.close();
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('UI/UX Research Corpus - Screenshot Capture');
  console.log('='.repeat(60));

  // Load apps
  const apps = loadApps();
  log(`\nLoaded ${apps.length} apps from seed file`);

  // Filter for apps with URLs
  const appsWithUrls = apps.filter((app) => app.url && app.url.trim() !== '');
  log(`Found ${appsWithUrls.length} apps with URLs to capture`);

  if (appsWithUrls.length === 0) {
    log('No apps with URLs found. Exiting.');
    return;
  }

  // Launch browser
  log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Process each app
    for (const app of appsWithUrls) {
      await captureAppScreenshots(browser, app);
    }
  } finally {
    await browser.close();
    log('\nBrowser closed');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Screenshot capture complete!');
  console.log(`Check ${RAW_SCREENS_DIR} for captured screenshots`);
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

export { main as captureScreenshots };
