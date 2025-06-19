import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  mobileViewport: {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  },
  targetDimensions: {
    width: 1080,
    height: 2400,
  },
  // iPhone frame configuration
  frameConfig: {
    framePath: path.join(__dirname, 'iphone-frame_Edited.png'), // Path to your transparent iPhone frame
    // Screen area within the frame (adjust these values based on your frame)
    screenArea: {
      x: 50, // X offset from left edge of frame
      y: 120, // Y offset from top edge of frame
      width: 980, // Width of screen area inside frame
      height: 2160, // Height of screen area inside frame
    },
  },
  outputDir: path.join(__dirname, 'screenshots'),
  timeout: 60000,
};

fs.ensureDirSync(CONFIG.outputDir);

const log = (
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info'
) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

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

const sanitizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .toLowerCase();
};

const compositeWithFrame = async (
  screenshotPath: string,
  outputPath: string
): Promise<void> => {
  const { framePath, screenArea } = CONFIG.frameConfig;

  try {
    // Check if frame file exists
    if (!fs.existsSync(framePath)) {
      throw new Error(`iPhone frame not found at: ${framePath}`);
    }

    // Get frame dimensions first
    const frameMetadata = await sharp(framePath).metadata();
    if (!frameMetadata.width || !frameMetadata.height) {
      throw new Error('Could not read frame dimensions');
    }

    // Get screenshot dimensions
    const screenshot = sharp(screenshotPath);
    const screenshotMetadata = await screenshot.metadata();
    if (!screenshotMetadata.width || !screenshotMetadata.height) {
      throw new Error('Could not read screenshot dimensions');
    }

    // Calculate scale to fit screenshot within screen area
    const scale = Math.min(
      screenArea.width / screenshotMetadata.width,
      screenArea.height / screenshotMetadata.height
    );

    const targetWidth = Math.floor(screenshotMetadata.width * scale);
    const targetHeight = Math.floor(screenshotMetadata.height * scale);

    // Calculate centered position within the screen area
    const left = Math.max(
      0,
      Math.floor(screenArea.x + (screenArea.width - targetWidth) / 2)
    );
    const top = Math.max(
      0,
      Math.floor(screenArea.y + (screenArea.height - targetHeight) / 2)
    );

    // Create a canvas with frame dimensions, place screenshot first, then frame on top
    await sharp({
      create: {
        width: frameMetadata.width,
        height: frameMetadata.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
      },
    })
      .composite([
        // First: Place the screenshot in the background
        {
          input: await sharp(screenshotPath)
            .resize(targetWidth, targetHeight, {
              fit: 'cover',
              position: 'top',
            })
            .toBuffer(),
          left,
          top,
        },
        // Second: Place the transparent iPhone frame ON TOP
        {
          input: framePath,
          blend: 'over', // Frame goes over the screenshot
          top: 0,
          left: 0,
        },
      ])
      .toFile(outputPath);

    log(`Successfully composited screenshot with iPhone frame`, 'success');
  } catch (error) {
    log(`Error in compositeWithFrame: ${error}`, 'error');
    // Fallback: Save the original screenshot without frame
    await sharp(screenshotPath)
      .resize(CONFIG.targetDimensions.width, CONFIG.targetDimensions.height, {
        fit: 'cover',
        position: 'top',
      })
      .toFile(outputPath);
  }
};

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

    await page.setUserAgent(CONFIG.mobileViewport.userAgent);
    await page.setViewport({
      width: CONFIG.mobileViewport.width,
      height: CONFIG.mobileViewport.height,
      deviceScaleFactor: CONFIG.mobileViewport.deviceScaleFactor,
      isMobile: CONFIG.mobileViewport.isMobile,
      hasTouch: CONFIG.mobileViewport.hasTouch,
    });

    await page.evaluateOnNewDocument(() => {
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

    const skipStatusCheckDomains = ['local.sparissimo.world'];
    const shouldSkipStatusCheck = skipStatusCheckDomains.some((domain) =>
      url.includes(domain)
    );

    if (!shouldSkipStatusCheck) {
      if (!response) {
        throw new Error('Navigation failed: No response');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
    }

    const getDomainFromUrl = (url: string): string => {
      try {
        const domain = new URL(url).hostname;
        return domain
          .replace(/^www\./, '')
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();
      } catch {
        return 'screenshot';
      }
    };

    const screenshotName = `${getDomainFromUrl(url)}.png`;
    const tempScreenshotPath = path.join(
      CONFIG.outputDir,
      `temp_${screenshotName}`
    );
    const rawScreenshotPath = path.join(
      CONFIG.outputDir,
      `raw_${screenshotName}`
    );
    const finalScreenshotPath = path.join(CONFIG.outputDir, screenshotName);
    tempImagePath = tempScreenshotPath;

    // Take the raw screenshot
    await page.screenshot({
      path: rawScreenshotPath,
      fullPage: true,
      type: 'png',
      fromSurface: true,
    });

    log(`Compositing screenshot with iPhone frame...`, 'info');

    // Composite the screenshot with the iPhone frame
    await compositeWithFrame(rawScreenshotPath, finalScreenshotPath);

    // Clean up temporary files
    if (fs.existsSync(rawScreenshotPath)) {
      fs.unlinkSync(rawScreenshotPath);
    }
    if (fs.existsSync(tempScreenshotPath)) {
      fs.unlinkSync(tempScreenshotPath);
    }

    const successMessage = `Screenshot with frame saved to ${finalScreenshotPath.replace(
      process.cwd(),
      '.'
    )}`;
    log(successMessage, 'success');
    return { success: true, message: successMessage };
  } catch (error) {
    // Clean up any temporary files
    const tempFiles = [tempImagePath];
    const getDomainFromUrl = (url: string): string => {
      try {
        const domain = new URL(url).hostname;
        return domain
          .replace(/^www\./, '')
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();
      } catch {
        return 'screenshot';
      }
    };

    tempFiles.push(
      path.join(CONFIG.outputDir, `raw_${getDomainFromUrl(url)}.png`)
    );

    tempFiles.forEach((file) => {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

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

  // Check if iPhone frame exists
  if (!fs.existsSync(CONFIG.frameConfig.framePath)) {
    log(`iPhone frame not found at: ${CONFIG.frameConfig.framePath}`, 'error');
    log(
      'Please ensure you have the iPhone frame image in the correct location.',
      'warning'
    );
    process.exit(1);
  }

  log(`Starting to process ${urls.length} URLs...`, 'info');
  log(`Using iPhone frame: ${CONFIG.frameConfig.framePath}`, 'info');

  const results = [];
  let successCount = 0;
  let failureCount = 0;

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

  const summary = `\n=== Screenshot Capture Summary ===
Total URLs processed: ${urls.length}
Successful: ${successCount}
Failed: ${failureCount}
iPhone frame applied: ${successCount > 0 ? 'Yes' : 'No'}
================================`;

  log(
    summary,
    successCount === urls.length
      ? 'success'
      : failureCount === urls.length
      ? 'error'
      : 'warning'
  );

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
