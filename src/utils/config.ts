import path from 'path';

export const CONFIG = {
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
    // 1320 × 2868px
    width: 1320,
    height: 2868,
  },
  frameConfig: {
    framePath: path.join(__dirname, '../../iphone-frame_Edited.png'),
    androidFramePath: path.join(__dirname, '../../android_frame.png'),
    screenArea: {
      x: 50,
      y: 120,
      width: 980,
      height: 2160,
    },
  },
  outputDir: path.join(process.cwd(), 'screenshots'),
  timeout: 60000,
};
