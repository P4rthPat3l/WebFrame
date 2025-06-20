import { CONFIG } from './config.ts';
import sharp from 'sharp';
import { log } from './logger.ts';
import fs from 'fs-extra';

export const compositeWithFrameAndroind = async (
  finalScreenshotPath: string,
): Promise<string> => {
  const framePath = CONFIG.frameConfig.androidFramePath;
  const timestamp = new Date().getTime();
  const outputPath = finalScreenshotPath.replace('.png', `_framed_android_${timestamp}.png`);

  try {
    if (!fs.existsSync(framePath)) {
      throw new Error(`iPhone frame not found at: ${framePath}`);
    }

    // Get screenshot dimensions
    const screenshot = sharp(finalScreenshotPath);
    const screenshotMetadata = await screenshot.metadata();
    if (!screenshotMetadata.width || !screenshotMetadata.height) {
      throw new Error('Could not read screenshot dimensions');
    }

    // Calculate dimensions to maintain target aspect ratio
    const targetWidth = CONFIG.targetDimensions.width;
    const targetHeight = CONFIG.targetDimensions.height;

    const scale = 0.9;
    const scaledWidth = Math.floor(targetWidth * scale);
    const scaledHeight = Math.floor(targetHeight * scale);

    const roundedCorners = Buffer.from(
      `<svg width="${scaledWidth}" height="${scaledHeight}">
        <rect 
          x="0" 
          y="0" 
          width="${scaledWidth}" 
          height="${scaledHeight}" 
          rx="60" 
          ry="60" 
          fill="#fff"
        />
      </svg>`,
    );

    // Apply rounded corners to the screenshot
    const roundedScreenshot = await sharp(finalScreenshotPath)
      .resize(scaledWidth, scaledHeight, {
        fit: 'cover',
        position: 'center',
      })
      .composite([
        {
          input: roundedCorners,
          blend: 'dest-in',
        },
      ])
      .toBuffer();

    // Create a transparent background with target dimensions
    const background = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    // Calculate position to center the screenshot within the frame
    const left = Math.floor((targetWidth - scaledWidth) / 2);
    const top = Math.floor((targetHeight - scaledHeight) / 2);

    // Composite the screenshot onto the transparent background
    const screenshotWithBg = await sharp(background)
      .composite([
        {
          input: roundedScreenshot,
          left,
          top,
        },
      ])
      .toBuffer();

    // Resize the frame to match target dimensions
    const resizedFrame = await sharp(framePath)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Composite the frame on top of the screenshot
    await sharp(screenshotWithBg)
      .composite([
        {
          input: resizedFrame,
          blend: 'over',
        },
      ])
      .toFile(outputPath);

    log(
      `Successfully composited screenshot with frame at: ${outputPath}`,
      'success',
    );
    return outputPath;
  } catch (error) {
    log(`Error in compositeWithFrame: ${error}`, 'error');
    return finalScreenshotPath;
  }
};
