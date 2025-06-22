import puppeteer from 'puppeteer';
import sharp from 'sharp';
import path from 'path';
import { log } from './logger.ts';
import fs from 'fs-extra';
import { getDomainFromUrl } from './utils.ts';
import { CONFIG } from './config.ts';
import {
  compositeWithFrame,
  compositeWithFrameAndroind,
} from './composition.ts';

export const takeScreenshot2_test = async (
  url: string,
  device?: unknown,
  width?: string,
  height?: string,
): Promise<{ success: boolean; message: string; path?: string }> => {
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
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
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
    const fullUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
    const response = await page.goto(fullUrl, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout,
    });

    //! TODO: Add status check
    const skipStatusCheckDomains = ['local.sparissimo.world'];
    const shouldSkipStatusCheck = skipStatusCheckDomains.some((domain) =>
      url.includes(domain),
    );

    if (!shouldSkipStatusCheck) {
      if (!response) {
        throw new Error('Navigation failed: No response');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');

    const screenshotName = `${getDomainFromUrl(url)}-${timestamp}.png`;

    const tempScreenshotPath = path.join(
      CONFIG.outputDir,
      `temp_${screenshotName}`,
    );
    const ResizedScreenshotPath = path.join(CONFIG.outputDir, screenshotName);
    tempImagePath = tempScreenshotPath;

    await page.screenshot({
      path: tempScreenshotPath,
      fullPage: true,
      type: 'png',
      fromSurface: true,
    });

    await sharp(tempScreenshotPath)
      .resize({
        width: Number(width) || CONFIG.targetDimensions.width,
        height: Number(height) || CONFIG.targetDimensions.height,
        fit: 'cover',
        position: 'top',
      })
      .toFile(ResizedScreenshotPath);

    let finalScreenshotPath = '';
    if (device === 'android') {
      finalScreenshotPath = await compositeWithFrameAndroind(
        ResizedScreenshotPath,
      );
    } else {
      finalScreenshotPath = await compositeWithFrame(ResizedScreenshotPath);
    }

    if (fs.existsSync(tempScreenshotPath)) {
      fs.unlinkSync(tempScreenshotPath);
    }

    if (fs.existsSync(ResizedScreenshotPath)) {
      fs.unlinkSync(ResizedScreenshotPath);
    }

    const successMessage = `Screenshot saved to ${ResizedScreenshotPath.replace(
      process.cwd(),
      '.',
    )}`;

    log(successMessage, 'success');
    return {
      success: true,
      message: successMessage,
      path: finalScreenshotPath,
    };
  } catch (error) {
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
