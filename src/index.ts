import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import cors from '@fastify/cors';
import { takeScreenshot2_test } from './utils/screenshot';
import { log } from './utils/logger';
import fs from 'fs-extra';
import { CONFIG } from './utils/config';

const app: FastifyInstance = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  return { status: 'ok' };
});

app.get('/screenshot', async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as {
    url: string;
    device?: string;
    width?: string;
    height?: string;
  };

  const { url, device = 'iphone', width, height } = query;
  request.log.info('URL: ' + url);

  if (!url) {
    return reply.status(400).send({
      error: 'URL parameter is required',
      example:
        '/screenshot?url=example.com&device=iphone&width=1080&height=2400',
    });
  }

  let processedUrl = url.toString();

  try {
    if (!processedUrl.match(/^https?:\/\//)) {
      processedUrl = `https://${processedUrl}`;
    }
    new URL(processedUrl);
  } catch (error) {
    return reply.status(400).send({
      error: 'Invalid URL',
      message: 'Please provide a valid URL with or without http:// or https://',
      providedUrl: url,
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
    request.log.info(`Processing URL: ${processedUrl}`);
    const result = await takeScreenshot2_test(
      processedUrl,
      device,
      width,
      height,
    );

    if (!result.success) {
      return reply.status(500).send({ error: result.message });
    }

    const filePath = result.path;

    if (!filePath)
      return reply.status(500).send({ error: 'File path not found' });

    const fileName = `${new URL(processedUrl).hostname}-${device}.png`;
    request.log.info(`File path: ${filePath}`);

    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    reply.type('image/png');

    return fs.createReadStream(filePath);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    return reply.status(500).send({
      error: 'Failed to take screenshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(
      `Screenshot endpoint: http://localhost:${PORT}/screenshot?url=example.com`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

start();
