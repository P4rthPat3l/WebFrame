import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import sharp from 'sharp';

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // iPhone 14 Pro Max viewport
  mobileViewport: {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  },
  // Target dimensions for final image
  targetDimensions: {
    width: 1080,
    height: 2400,
  },
  outputDir: path.join(__dirname, 'screenshots'),
  timeout: 60000, // 60 seconds timeout for page load
};

// Create output directory if it doesn't exist
fs.ensureDirSync(CONFIG.outputDir);

// Simplified log function that only logs to console
const log = (
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info'
) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

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
};

// Function to sanitize URL for directory name
const sanitizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .toLowerCase();
};

// Function to take screenshot of a single URL
const takeScreenshot = async (
  url: string
): Promise<{ success: boolean; message: string }> => {
  let browser;
  let tempImagePath = '';

  try {
    log(`Starting browser for ${url}`, 'info');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set mobile viewport and user agent
    await page.setUserAgent(CONFIG.mobileViewport.userAgent);
    await page.setViewport({
      width: CONFIG.mobileViewport.width,
      height: CONFIG.mobileViewport.height,
      deviceScaleFactor: CONFIG.mobileViewport.deviceScaleFactor,
      isMobile: CONFIG.mobileViewport.isMobile,
      hasTouch: CONFIG.mobileViewport.hasTouch,
    });

    // Force mobile viewport meta tag and fix viewport height
    await page.evaluateOnNewDocument(() => {
      // Set viewport meta tag
      let viewport = document.querySelector('meta[name=viewport]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );

      // Add CSS to ensure proper viewport height
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh !important;
          height: 100% !important;
          position: relative;
          overflow-x: hidden;
        }
        /* Ensure the footer stays at bottom */
        body {
          display: flex;
          flex-direction: column;
        }
        /* Target common footer classes */
        footer, .footer, [class*="footer-"], [id*="footer-"], 
        [class*="bottom-bar"], [id*="bottom-bar"] {
          margin-top: auto !important;
        }
      `;
      document.head.appendChild(style);
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

    // Create a directory for this website
    const siteDir = path.join(CONFIG.outputDir, sanitizeUrl(url));
    fs.ensureDirSync(siteDir);

    // Generate a clean filename
    const screenshotName = 'screenshot.png';
    const tempScreenshotPath = path.join(siteDir, 'temp_screenshot.png');
    const finalScreenshotPath = path.join(siteDir, screenshotName);
    tempImagePath = tempScreenshotPath;

    // Take screenshot of the full page
    await page.screenshot({
      path: tempScreenshotPath,
      fullPage: true,
      type: 'png',
      fromSurface: true,
    });

    // Resize the image to target dimensions
    await sharp(tempScreenshotPath)
      .resize({
        width: CONFIG.targetDimensions.width,
        height: CONFIG.targetDimensions.height,
        fit: 'cover',
        position: 'top',
      })
      .toFile(finalScreenshotPath);

    // Remove temporary file if it exists
    if (fs.existsSync(tempScreenshotPath)) {
      fs.unlinkSync(tempScreenshotPath);
    }

    const successMessage = `Screenshot saved to ${finalScreenshotPath.replace(
      process.cwd(),
      '.'
    )}`;
    log(successMessage, 'success');
    return { success: true, message: successMessage };
  } catch (error) {
    // Clean up temp file if it exists
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }

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

// Main function to process multiple URLs
const main = async () => {
  // Check if URLs are provided as command line arguments
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

  // Process URLs sequentially
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

  // Generate summary
  const summary = `\n=== Screenshot Capture Summary ===
Total URLs processed: ${urls.length}
Successful: ${successCount}
Failed: ${failureCount}
================================`;

  log(
    summary,
    successCount === urls.length
      ? 'success'
      : failureCount === urls.length
      ? 'error'
      : 'warning'
  );

  // Exit with appropriate status code
  process.exit(failureCount === 0 ? 0 : 1);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  log(`Uncaught exception: ${error}`, 'error');
  process.exit(1);
});
