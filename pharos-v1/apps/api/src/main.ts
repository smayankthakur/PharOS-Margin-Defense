import { randomUUID } from "node:crypto";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  await app.register(helmet as unknown as never);
  await app.register(cors as unknown as never, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const redisEnabled = Boolean(process.env.REDIS_URL && process.env.RATE_LIMIT_BACKEND === "redis");
  await app.register(rateLimit as unknown as never, {
    global: true,
    max: 150,
    timeWindow: "1 minute",
    ...(redisEnabled ? { redis: process.env.REDIS_URL } : {}),
  });

  app.use((req: { headers: Record<string, string | string[] | undefined>; id?: string }, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const headerId = req.headers["x-request-id"];
    req.id = typeof headerId === "string" ? headerId : randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix("api");
  await app.listen(Number(process.env.API_PORT ?? 4000), "0.0.0.0");
}

void bootstrap();
