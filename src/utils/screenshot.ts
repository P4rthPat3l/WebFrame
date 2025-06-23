import type { FastifyBaseLogger } from 'fastify';
import puppeteer from 'puppeteer';
import { CONFIG } from './config.ts';
import sharp from 'sharp';
import { applyDeviceFrame } from './composition.ts';

interface ScreenshotOptions {
  width?: number;
  height?: number;
  device?: string;
  outputPath?: string;
}

declare const fetch: typeof globalThis.fetch;

const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
};

export const processWebsiteScreenshot = async (
  url: string,
  options: ScreenshotOptions = {},
  log: FastifyBaseLogger,
): Promise<Buffer> => {
  let browser;

  try {
    log.info(`Starting browser for ${url}`, 'info');

    // Handle direct image URLs
    if (isImageUrl(url)) {
      log.info('Detected direct image URL, fetching directly');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }
      const imageBuffer = await response.arrayBuffer();
      return await processScreenshot(Buffer.from(imageBuffer), options, log);
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await configurePage(page, url);
    await navigateToUrl(page, url);

    const screenshotBuffer = await captureScreenshot(page, options);
    return await processScreenshot(screenshotBuffer, options, log);
  } finally {
    if (browser) await browser.close();
  }
};

export const processScreenshot = async (
  imageBuffer: Buffer,
  options: ScreenshotOptions = {},
  log: FastifyBaseLogger,
): Promise<Buffer> => {
  const {
    width = CONFIG.targetDimensions.width,
    height = CONFIG.targetDimensions.height,
    device,
  } = options;

  let processedImage = sharp(imageBuffer).resize({
    width,
    height,
    fit: 'cover',
    position: 'top',
  });

  if (device) {
    try {
      const resizedBuffer = await processedImage.toBuffer();
      return await applyDeviceFrame(resizedBuffer, device);
    } catch (error) {
      log.info(`Error applying device frame: ${error}`, 'error');
      throw error;
    }
  }

  return processedImage.toBuffer();
};

const configurePage = async (page: any, url: string): Promise<void> => {
  await page.setUserAgent(CONFIG.mobileViewport.userAgent);
  await page.setViewport({
    width: CONFIG.mobileViewport.width,
    height: CONFIG.mobileViewport.height,
    deviceScaleFactor: CONFIG.mobileViewport.deviceScaleFactor,
    isMobile: CONFIG.mobileViewport.isMobile,
    hasTouch: CONFIG.mobileViewport.hasTouch,
  });

  await page.evaluateOnNewDocument(() => {
    let viewport =
      document.querySelector('meta[name=viewport]') ||
      document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
    );
    document.head.appendChild(viewport);

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
      body { display: flex; flex-direction: column; }
      footer, .footer, [class*="footer-"], [id*="footer-"], 
      [class*="bottom-bar"], [id*="bottom-bar"] {
        margin-top: auto !important;
      }
    `;
    document.head.appendChild(style);
  });
};

const navigateToUrl = async (page: any, url: string): Promise<void> => {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const response = await page.goto(fullUrl, {
    waitUntil: 'networkidle0',
    timeout: CONFIG.timeout,
  });

  if (!response) throw new Error('Navigation failed: No response');

  const skipStatusCheckDomains = ['local.sparissimo.world'];
  const shouldSkipStatusCheck = skipStatusCheckDomains.some((domain) =>
    url.includes(domain),
  );

  if (!shouldSkipStatusCheck && !response.ok()) {
    throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
  }
};

const captureScreenshot = async (
  page: any,
  options: ScreenshotOptions,
): Promise<Buffer> => {
  return (await page.screenshot({
    fullPage: true,
    type: 'png',
    encoding: 'binary',
  })) as Buffer;
};
