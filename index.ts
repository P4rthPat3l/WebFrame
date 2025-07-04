// import puppeteer from 'puppeteer';
// import fs from 'fs-extra';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import chalk from 'chalk';
// import sharp from 'sharp';
// import { log } from 'node:util';
// import { getDomainFromUrl } from './src/utils/utils.ts';
//
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
//
// const CONFIG = {
//   mobileViewport: {
//     width: 430,
//     height: 932,
//     deviceScaleFactor: 3,
//     isMobile: true,
//     hasTouch: true,
//     userAgent:
//       'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
//   },
//   targetDimensions: {
//     width: 1080,
//     height: 2400,
//   },
//   // iPhone frame configuration
//   frameConfig: {
//     framePath: path.join(__dirname, 'iphone-frame_Edited.png'), // Path to your transparent iPhone frame
//     androidFramePath: path.join(__dirname, 'android_frame.png'),
//     // Screen area within the frame (adjust these values based on your frame)
//     screenArea: {
//       x: 50, // X offset from left edge of frame
//       y: 120, // Y offset from top edge of frame
//       width: 980, // Width of screen area inside frame
//       height: 2160, // Height of screen area inside frame
//     },
//   },
//   outputDir: path.join(__dirname, 'screenshots'),
//   timeout: 60000,
// };
//
// fs.ensureDirSync(CONFIG.outputDir);
//
// const sanitizeUrl = (url: string): string => {
//   return url
//     .replace(/^https?:\/\//, '')
//     .replace(/[^a-zA-Z0-9-]/g, '_')
//     .toLowerCase();
// };
//
// const compositeWithFrame = async (
//   finalScreenshotPath: string,
// ): Promise<string> => {
//   const framePath = CONFIG.frameConfig.framePath;
//   const outputPath = finalScreenshotPath.replace('.png', '_framed.png');
//
//   try {
//     if (!fs.existsSync(framePath)) {
//       throw new Error(`iPhone frame not found at: ${framePath}`);
//     }
//
//     // Get screenshot dimensions
//     const screenshot = sharp(finalScreenshotPath);
//     const screenshotMetadata = await screenshot.metadata();
//     if (!screenshotMetadata.width || !screenshotMetadata.height) {
//       throw new Error('Could not read screenshot dimensions');
//     }
//
//     // Calculate dimensions to maintain target aspect ratio
//     const targetWidth = CONFIG.targetDimensions.width;
//     const targetHeight = CONFIG.targetDimensions.height;
//
//     // Calculate scaling factor to fit screenshot within frame
//     const scale = 0.9; // Adjust this value (0-1) to control how much of the frame is filled
//     const scaledWidth = Math.floor(targetWidth * scale);
//     const scaledHeight = Math.floor(targetHeight * scale);
//
//     // Create rounded corners mask
//     const roundedCorners = Buffer.from(
//       `<svg width="${scaledWidth}" height="${scaledHeight}">
//         <rect
//           x="0"
//           y="0"
//           width="${scaledWidth}"
//           height="${scaledHeight}"
//           rx="60"
//           ry="60"
//           fill="#fff"
//         />
//       </svg>`,
//     );
//
//     // Apply rounded corners to the screenshot
//     const roundedScreenshot = await sharp(finalScreenshotPath)
//       .resize(scaledWidth, scaledHeight, {
//         fit: 'cover',
//         position: 'center',
//       })
//       .composite([
//         {
//           input: roundedCorners,
//           blend: 'dest-in',
//         },
//       ])
//       .toBuffer();
//
//     // Create a transparent background with target dimensions
//     const background = await sharp({
//       create: {
//         width: targetWidth,
//         height: targetHeight,
//         channels: 4,
//         background: { r: 0, g: 0, b: 0, alpha: 0 },
//       },
//     })
//       .png()
//       .toBuffer();
//
//     // Calculate position to center the screenshot within the frame
//     const left = Math.floor((targetWidth - scaledWidth) / 2);
//     const top = Math.floor((targetHeight - scaledHeight) / 2);
//
//     // Composite the screenshot onto the transparent background
//     const screenshotWithBg = await sharp(background)
//       .composite([
//         {
//           input: roundedScreenshot,
//           left,
//           top,
//         },
//       ])
//       .toBuffer();
//
//     // Resize the frame to match target dimensions
//     const resizedFrame = await sharp(framePath)
//       .resize(targetWidth, targetHeight - 110, {
//         fit: 'fill',
//         background: { r: 0, g: 0, b: 0, alpha: 0 },
//       })
//       .toBuffer();
//
//     // Composite the frame on top of the screenshot
//     await sharp(screenshotWithBg)
//       .composite([
//         {
//           input: resizedFrame,
//           blend: 'over',
//         },
//       ])
//       .toFile(outputPath);
//
//     log(
//       `Successfully composited screenshot with frame at: ${outputPath}`,
//       'success',
//     );
//     return outputPath;
//   } catch (error) {
//     log(`Error in compositeWithFrame: ${error}`, 'error');
//     return finalScreenshotPath;
//   }
// };
//
// export const compositeWithFrameAndroind = async (
//   finalScreenshotPath: string,
// ): Promise<string> => {
//   const framePath = CONFIG.frameConfig.androidFramePath;
//   const outputPath = finalScreenshotPath.replace('.png', '_framed_android.png');
//
//   try {
//     if (!fs.existsSync(framePath)) {
//       throw new Error(`iPhone frame not found at: ${framePath}`);
//     }
//
//     // Get screenshot dimensions
//     const screenshot = sharp(finalScreenshotPath);
//     const screenshotMetadata = await screenshot.metadata();
//     if (!screenshotMetadata.width || !screenshotMetadata.height) {
//       throw new Error('Could not read screenshot dimensions');
//     }
//
//     // Calculate dimensions to maintain target aspect ratio
//     const targetWidth = CONFIG.targetDimensions.width;
//     const targetHeight = CONFIG.targetDimensions.height;
//
//     // Calculate scaling factor to fit screenshot within frame
//     const scale = 0.9; // Adjust this value (0-1) to control how much of the frame is filled
//     const scaledWidth = Math.floor(targetWidth * scale);
//     const scaledHeight = Math.floor(targetHeight * scale);
//
//     // Create rounded corners mask
//     const roundedCorners = Buffer.from(
//       `<svg width="${scaledWidth}" height="${scaledHeight}">
//         <rect
//           x="0"
//           y="0"
//           width="${scaledWidth}"
//           height="${scaledHeight}"
//           rx="60"
//           ry="60"
//           fill="#fff"
//         />
//       </svg>`,
//     );
//
//     // Apply rounded corners to the screenshot
//     const roundedScreenshot = await sharp(finalScreenshotPath)
//       .resize(scaledWidth, scaledHeight, {
//         fit: 'cover',
//         position: 'center',
//       })
//       .composite([
//         {
//           input: roundedCorners,
//           blend: 'dest-in',
//         },
//       ])
//       .toBuffer();
//
//     // Create a transparent background with target dimensions
//     const background = await sharp({
//       create: {
//         width: targetWidth,
//         height: targetHeight,
//         channels: 4,
//         background: { r: 0, g: 0, b: 0, alpha: 0 },
//       },
//     })
//       .png()
//       .toBuffer();
//
//     // Calculate position to center the screenshot within the frame
//     const left = Math.floor((targetWidth - scaledWidth) / 2);
//     const top = Math.floor((targetHeight - scaledHeight) / 2);
//
//     // Composite the screenshot onto the transparent background
//     const screenshotWithBg = await sharp(background)
//       .composite([
//         {
//           input: roundedScreenshot,
//           left,
//           top,
//         },
//       ])
//       .toBuffer();
//
//     // Resize the frame to match target dimensions
//     const resizedFrame = await sharp(framePath)
//       .resize(targetWidth, targetHeight, {
//         fit: 'contain',
//         background: { r: 0, g: 0, b: 0, alpha: 0 },
//       })
//       .toBuffer();
//
//     // Composite the frame on top of the screenshot
//     await sharp(screenshotWithBg)
//       .composite([
//         {
//           input: resizedFrame,
//           blend: 'over',
//         },
//       ])
//       .toFile(outputPath);
//
//     log(
//       `Successfully composited screenshot with frame at: ${outputPath}`,
//       'success',
//     );
//     return outputPath;
//   } catch (error) {
//     log(`Error in compositeWithFrame: ${error}`, 'error');
//     return finalScreenshotPath;
//   }
// };
//
// const takeScreenshot2 = async (
//   url: string,
// ): Promise<{ success: boolean; message: string }> => {
//   let browser;
//   let tempImagePath = '';
//
//   try {
//     log(`Starting browser for ${url}`, 'info');
//     browser = await puppeteer.launch({
//       headless: true,
//       executablePath: '/usr/bin/chromium-browser',
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });
//
//     const page = await browser.newPage();
//
//     await page.setUserAgent(CONFIG.mobileViewport.userAgent);
//     await page.setViewport({
//       width: CONFIG.mobileViewport.width,
//       height: CONFIG.mobileViewport.height,
//       deviceScaleFactor: CONFIG.mobileViewport.deviceScaleFactor,
//       isMobile: CONFIG.mobileViewport.isMobile,
//       hasTouch: CONFIG.mobileViewport.hasTouch,
//     });
//
//     await page.evaluateOnNewDocument(() => {
//       let viewport = document.querySelector('meta[name=viewport]');
//       if (!viewport) {
//         viewport = document.createElement('meta');
//         viewport.setAttribute('name', 'viewport');
//         document.head.appendChild(viewport);
//       }
//       viewport.setAttribute(
//         'content',
//         'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
//       );
//
//       const style = document.createElement('style');
//       style.textContent = `
//         html, body {
//           margin: 0;
//           padding: 0;
//           width: 100%;
//           min-height: 100vh !important;
//           height: 100% !important;
//           position: relative;
//           overflow-x: hidden;
//         }
//         /* Ensure the footer stays at bottom */
//         body {
//           display: flex;
//           flex-direction: column;
//         }
//         /* Target common footer classes */
//         footer, .footer, [class*="footer-"], [id*="footer-"],
//         [class*="bottom-bar"], [id*="bottom-bar"] {
//           margin-top: auto !important;
//         }
//       `;
//       document.head.appendChild(style);
//     });
//
//     log(`Navigating to ${url}`, 'info');
//     const response = await page.goto(url, {
//       waitUntil: 'networkidle0',
//       timeout: CONFIG.timeout,
//     });
//
//     const skipStatusCheckDomains = ['local.sparissimo.world'];
//     const shouldSkipStatusCheck = skipStatusCheckDomains.some((domain) =>
//       url.includes(domain),
//     );
//
//     if (!shouldSkipStatusCheck) {
//       if (!response) {
//         throw new Error('Navigation failed: No response');
//       }
//
//       if (!response.ok()) {
//         throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
//       }
//     }
//
//     const screenshotName = `${getDomainFromUrl(url)}.png`;
//     const tempScreenshotPath = path.join(
//       CONFIG.outputDir,
//       `temp_${screenshotName}`,
//     );
//     const finalScreenshotPath = path.join(CONFIG.outputDir, screenshotName);
//     tempImagePath = tempScreenshotPath;
//
//     await page.screenshot({
//       path: tempScreenshotPath,
//       fullPage: true,
//       type: 'png',
//       fromSurface: true,
//     });
//
//     await sharp(tempScreenshotPath)
//       .resize({
//         width: CONFIG.targetDimensions.width,
//         height: CONFIG.targetDimensions.height,
//         fit: 'cover',
//         position: 'top',
//       })
//       .toFile(finalScreenshotPath);
//
//     const framedImagePath = await compositeWithFrame(finalScreenshotPath);
//
//     const framedImagePathAndroid =
//       await compositeWithFrameAndroind(finalScreenshotPath);
//
//     if (fs.existsSync(tempScreenshotPath)) {
//       fs.unlinkSync(tempScreenshotPath);
//     }
//
//     if (fs.existsSync(finalScreenshotPath)) {
//       fs.unlinkSync(finalScreenshotPath);
//     }
//
//     const successMessage = `Screenshot saved to ${framedImagePath.replace(
//       process.cwd(),
//       '.',
//     )}`;
//
//     log(successMessage, 'success');
//     return { success: true, message: successMessage };
//   } catch (error) {
//     if (tempImagePath && fs.existsSync(tempImagePath)) {
//       fs.unlinkSync(tempImagePath);
//     }
//
//     const errorMessage = `Error capturing ${url}: ${
//       error instanceof Error ? error.message : String(error)
//     }`;
//     log(errorMessage, 'error');
//     return { success: false, message: errorMessage };
//   } finally {
//     if (browser) {
//       await browser.close();
//       log(`Browser closed for ${url}`, 'info');
//     }
//   }
// };
//
// const main = async () => {
//   const urls = process.argv.slice(2);
//
//   if (urls.length === 0) {
//     log('Please provide at least one URL as a command-line argument.', 'error');
//     log('Example: bun start https://example.com https://example.org', 'info');
//     process.exit(1);
//   }
//
//   // Check if iPhone frame exists
//   if (!fs.existsSync(CONFIG.frameConfig.framePath)) {
//     log(`iPhone frame not found at: ${CONFIG.frameConfig.framePath}`, 'error');
//     log(
//       'Please ensure you have the iPhone frame image in the correct location.',
//       'warning',
//     );
//     process.exit(1);
//   }
//
//   log(`Starting to process ${urls.length} URLs...`, 'info');
//   log(`Using iPhone frame: ${CONFIG.frameConfig.framePath}`, 'info');
//
//   const results = [];
//   let successCount = 0;
//   let failureCount = 0;
//
//   for (const url of urls) {
//     log(`\nProcessing URL: ${url}`, 'info');
//     const result = await takeScreenshot2(url);
//     results.push({ url, ...result });
//
//     if (result.success) {
//       successCount++;
//     } else {
//       failureCount++;
//     }
//   }
//
//   const summary = `\n=== Screenshot Capture Summary ===
// Total URLs processed: ${urls.length}
// Successful: ${successCount}
// Failed: ${failureCount}
// iPhone frame applied: ${successCount > 0 ? 'Yes' : 'No'}
// ================================`;
//
//   log(
//     summary,
//     successCount === urls.length
//       ? 'success'
//       : failureCount === urls.length
//         ? 'error'
//         : 'warning',
//   );
//
//   process.exit(failureCount === 0 ? 0 : 1);
// };
//
// process.on('unhandledRejection', (reason, promise) => {
//   log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
//   process.exit(1);
// });
//
// main().catch((error) => {
//   log(`Uncaught exception: ${error}`, 'error');
//   process.exit(1);
// });
