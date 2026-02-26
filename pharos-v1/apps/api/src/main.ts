import { randomUUID } from "node:crypto";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import pino from "pino";
import { AppModule } from "./app.module";
import { apiEnv } from "./env";

async function bootstrap(): Promise<void> {
  const logger = pino({ level: apiEnv.LOG_LEVEL });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandledRejection");
    process.exit(1);
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaughtException");
    process.exit(1);
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  await app.register(helmet as unknown as never);
  await app.register(cors as unknown as never, {
    origin: apiEnv.CORS_ORIGIN.split(","),
    credentials: true,
  });

  const redisEnabled = apiEnv.RATE_LIMIT_BACKEND === "redis" && Boolean(apiEnv.REDIS_URL);
  await app.register(rateLimit as unknown as never, {
    global: true,
    max: 150,
    timeWindow: "1 minute",
    ...(redisEnabled ? { redis: apiEnv.REDIS_URL } : {}),
  });

  app.use((req: { headers: Record<string, string | string[] | undefined>; id?: string }, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const headerId = req.headers["x-request-id"];
    req.id = typeof headerId === "string" ? headerId : randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix("api");
  app.getHttpAdapter().get("/health", (_request: unknown, reply: { send: (payload: unknown) => void }) => {
    reply.send({ ok: true });
  });
  await app.listen(apiEnv.PORT, "0.0.0.0");
}

void bootstrap();
