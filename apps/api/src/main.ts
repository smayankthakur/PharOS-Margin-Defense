import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { randomUUID } from "crypto";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import IORedis from "ioredis";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  await app.register(helmet as any);
  await app.register(cors as any, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const redisUrl = process.env.REDIS_URL;
  const redis = redisUrl ? new IORedis(redisUrl, { maxRetriesPerRequest: null }) : undefined;

  await app.register(rateLimit as any, {
    max: 100,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req: any) => req.headers["x-forwarded-for"]?.toString() ?? req.ip,
  });

  app.use((req: any, res: any, next: () => void) => {
    req.requestId = req.headers["x-request-id"] ?? randomUUID();
    res.header("x-request-id", req.requestId);
    next();
  });

  app.setGlobalPrefix("api");
  await app.listen(Number(process.env.API_PORT ?? 4000), "0.0.0.0");
}

bootstrap();
