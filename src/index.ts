import cors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import ejs from "ejs";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { fileURLToPath } from "node:url";
import path from "path";
import { CONFIG } from "./utils/config";
import {
  processScreenshot,
  processWebsiteScreenshot,
} from "./utils/screenshot";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: FastifyInstance = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(fastifyView, {
  engine: {
    ejs: ejs,
  },
  root: path.join(__dirname, "../views"),
  viewExt: "ejs",
});

await app.register(fastifyStatic, {
  root: path.join(__dirname, "../public"),
  prefix: "/public/",
});

await app.register(fastifyMultipart, {
  addToBody: true,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.view("index.ejs");
});

app.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
  return { status: "ok" };
});

app.get("/screenshot", async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as {
    url: string;
    device?: string;
    width?: string;
    height?: string;
  };

  const { url, device = "iphone", width, height } = query;
  request.log.info("Processing URL: " + url);

  if (!url) {
    return reply.status(400).send({
      error: "URL parameter is required",
      example:
        "/screenshot?url=example.com&device=iphone&width=1080&height=2400",
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
      error: "Invalid URL",
      message: "Please provide a valid URL with or without http:// or https://",
      providedUrl: url,
    });
  }

  try {
    const imageBuffer = await processWebsiteScreenshot(
      processedUrl,
      {
        device,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
      },
      request.log
    );

    const fileName = `${
      new URL(processedUrl).hostname
    }-${device}-${Date.now()}.png`;

    reply
      .header("Content-Type", "image/png")
      .header("Content-Disposition", `inline; filename="${fileName}"`)
      .send(imageBuffer);
  } catch (error) {
    request.log.error("Error taking screenshot:", error);
    return reply.status(500).send({
      error: "Failed to take screenshot",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/upload", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const data = await (request as any).file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const device = (request.query as { device?: string })?.device || "iphone";
    const buffer = await data.toBuffer();

    const processedImage = await processScreenshot(
      buffer,
      {
        device,
        width: CONFIG.targetDimensions.width,
        height: CONFIG.targetDimensions.height,
      },
      request.log
    );

    const fileName = `framed-${device}-${Date.now()}.png`;

    reply
      .header("Content-Type", "image/png")
      .header("Content-Disposition", `inline; filename="${fileName}"`)
      .send(processedImage);
  } catch (error) {
    request.log.error("Error processing uploaded image:", error);
    return reply.status(500).send({
      error: "Failed to process image",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(
      `Screenshot endpoint: http://localhost:${PORT}/screenshot?url=example.com`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

start();
