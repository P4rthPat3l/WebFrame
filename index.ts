import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  viewport: {
    // Standard mobile device dimensions (e.g., iPhone 12 Pro)
    width: 1080,
    height: 2400,
    deviceScaleFactor: 3, // Device pixel ratio (3x for retina displays)
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    deviceMetrics: {
      width: 390, // Device width in physical pixels
      height: 844, // Device height in physical pixels
      pixelRatio: 3, // Device pixel ratio
      mobile: true,
    },
  },
  outputDir: path.join(__dirname, 'screenshots'),
  logFile: 'screenshot-log.txt',
  timeout: 30000, // 30 seconds timeout for page load
};

// Create output directory if it doesn't exist
fs.ensureDirSync(CONFIG.outputDir);

// Log function to write to both console and log file
const log = (
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info'
) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  // Log to console with colors
  switch (type) {
    case 'success':
      console.log(chalk.green(logMessage));
      break;
    case 'error':
      console.error(chalk.red(logMessage));
      break;
    case 'warning':
      console.warn(chalk.yellow(logMessage));
      break;
    default:
      console.log(logMessage);
  }

  // Append to log file
  fs.appendFileSync(
    path.join(CONFIG.outputDir, CONFIG.logFile),
    logMessage + '\n'
  );
};

// Function to sanitize URL for directory name
const sanitizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .toLowerCase();
};

const takeScreenshot = async (
  url: string
): Promise<{ success: boolean; message: string }> => {
  let browser;
  try {
    log(`Starting browser for ${url}`, 'info');

    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set mobile viewport and user agent
    await page.setUserAgent(CONFIG.viewport.userAgent);
    await page.setViewport({
      width: CONFIG.viewport.width,
      height: CONFIG.viewport.height,
      deviceScaleFactor: CONFIG.viewport.deviceScaleFactor,
      isMobile: CONFIG.viewport.isMobile,
      hasTouch: CONFIG.viewport.hasTouch,
    });

    // Set device metrics for mobile emulation
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: CONFIG.viewport.deviceMetrics.width,
      height: CONFIG.viewport.deviceMetrics.height,
      deviceScaleFactor: CONFIG.viewport.deviceMetrics.pixelRatio,
      mobile: CONFIG.viewport.deviceMetrics.mobile,
      viewport: {
        x: 0,
        y: 0,
        width: CONFIG.viewport.width,
        height: CONFIG.viewport.height,
        scale: 1, // Ensure no zoom
      },
    });

    // Disable viewport scaling
    await page.addStyleTag({
      content: `
        @viewport {
          width: device-width;
          initial-scale: 1.0;
          minimum-scale: 1.0;
          maximum-scale: 1.0;
          user-scalable: no;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
      `,
    });

    log(`Navigating to ${url}`, 'info');
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout,
    });

    if (!response) {
      throw new Error('Navigation failed: No response');
    }

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }

    const siteDir = path.join(CONFIG.outputDir, sanitizeUrl(url));
    fs.ensureDirSync(siteDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(siteDir, `screenshot-${timestamp}.png`);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    const successMessage = `Screenshot saved to ${screenshotPath}`;
    log(successMessage, 'success');
    return { success: true, message: successMessage };
  } catch (error) {
    const errorMessage = `Error capturing ${url}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    log(errorMessage, 'error');
    return { success: false, message: errorMessage };
  } finally {
    if (browser) {
      await browser.close();
      log(`Browser closed for ${url}`, 'info');
    }
  }
};

const main = async () => {
  const urls = process.argv.slice(2);

  if (urls.length === 0) {
    log('Please provide at least one URL as a command-line argument.', 'error');
    log('Example: bun start https://example.com https://example.org', 'info');
    process.exit(1);
  }

  log(`Starting to process ${urls.length} URLs...`, 'info');

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  //* Process URLs sequentially
  for (const url of urls) {
    log(`\nProcessing URL: ${url}`, 'info');
    const result = await takeScreenshot(url);
    results.push({ url, ...result });

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  //* Generate summary
  const summary = `\n=== Screenshot Capture Summary ===
Total URLs processed: ${urls.length}
Successful: ${successCount}
Failed: ${failureCount}
Log file: ${path.join(CONFIG.outputDir, CONFIG.logFile)}
================================`;

  log(
    summary,
    successCount === urls.length
      ? 'success'
      : failureCount === urls.length
      ? 'error'
      : 'warning'
  );

  //* Exit with appropriate status code
  process.exit(failureCount === 0 ? 0 : 1);
};

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

main().catch((error) => {
  log(`Uncaught exception: ${error}`, 'error');
  process.exit(1);
});
