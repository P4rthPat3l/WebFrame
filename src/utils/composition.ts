import { CONFIG } from './config.ts';
import sharp from 'sharp';
import { log } from './logger.ts';
import fs from 'fs-extra';

export const applyDeviceFrame = async (
  imageBuffer: Buffer,
  device: string,
): Promise<Buffer> => {
  try {
    const framePath =
      device === 'android'
        ? CONFIG.frameConfig.androidFramePath
        : CONFIG.frameConfig.framePath;

    if (!fs.existsSync(framePath)) {
      throw new Error(`Device frame not found at: ${framePath}`);
    }

    const image = sharp(imageBuffer);
    const imageMetadata = await image.metadata();

    if (!imageMetadata.width || !imageMetadata.height) {
      throw new Error('Could not read image dimensions');
    }

    const targetWidth = CONFIG.targetDimensions.width;
    const targetHeight = CONFIG.targetDimensions.height;

    const scale = device === 'android' ? 0.9 : 0.9;
    const scaledWidth = Math.floor(targetWidth * scale);
    const scaledHeight = Math.floor(targetHeight * scale);

    const roundedCorners = Buffer.from(
      `<svg width="${scaledWidth}" height="${scaledHeight}">
        <rect 
          x="0" 
          y="0" 
          width="${scaledWidth}" 
          height="${scaledHeight}" 
          rx="${device === 'android' ? 60 : 60}" 
          ry="${device === 'android' ? 60 : 60}" 
          fill="#fff"
        />
      </svg>`,
    );

    //  rounded corners to the image
    const roundedImage = await image
      .resize(scaledWidth, scaledHeight, {
        fit: 'cover',
        position: 'center',
      })
      .composite([{ input: roundedCorners, blend: 'dest-in' }])
      .toBuffer();

    //  transparent background with target dimensions
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

    //  center the image within the frame
    const left = Math.floor((targetWidth - scaledWidth) / 2);
    const top = Math.floor((targetHeight - scaledHeight) / 2);

    const imageWithBg = await sharp(background)
      .composite([{ input: roundedImage, left, top }])
      .toBuffer();

    const frameImage = await sharp(framePath)
      .resize(
        targetWidth,
        device === 'android' ? targetHeight : targetHeight - 110,
        {
          fit: device === 'android' ? 'contain' : 'fill',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      )
      .toBuffer();

    return await sharp(imageWithBg)
      .composite([{ input: frameImage, blend: 'over' }])
      .toBuffer();
  } catch (error) {
    log(`Error in applyDeviceFrame: ${error}`, 'error');
    throw error;
  }
};
