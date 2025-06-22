import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { takeScreenshot2_test } from './utils/screenshot';
import { log } from './utils/logger.ts';
import fs from 'fs-extra';
import { CONFIG } from './utils/config.ts';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/screenshot', async (req, res) => {
  let { url, device = 'iphone', width, height } = req.query;
  log('URL: ' + url, 'info');

  if (!url) {
    res.status(400).json({
      error: 'URL parameter is required',
      example:
        '/screenshot?url=example.com&device=iphone&width=1080&height=2400',
    });
    return;
  }

  const urlStr = url.toString();
  let processedUrl = urlStr;

  try {
    if (!urlStr.match(/^https?:\/\//)) {
      processedUrl = `https://${urlStr}`;
    }
    new URL(processedUrl);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'Please provide a valid URL with or without http:// or https://',
      providedUrl: urlStr,
    });
  }

  if (!fs.existsSync(CONFIG.frameConfig.framePath)) {
    log(`iPhone frame not found at: ${CONFIG.frameConfig.framePath}`, 'error');
    log(
      'Please ensure you have the iPhone frame image in the correct location.',
      'warning',
    );
    process.exit(1);
  }

  try {
    log(`\nProcessing URL: ${processedUrl}`, 'info');

    const result = await takeScreenshot2_test(processedUrl, device, width, height);

    if (!result.success) {
      return res.status(500).send(result.message);
    }

    const filePath = result.path;
    const fileName = `${new URL(processedUrl).hostname}-${device}.png`;
    log('File path: ' + filePath, 'info');

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error sending file');
        }
      }
    });
    return;
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({
      error: 'Failed to take screenshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(
    `Screenshot endpoint: http://localhost:${PORT}/screenshot?url=example.com`,
  );
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
