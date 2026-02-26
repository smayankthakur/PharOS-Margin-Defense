import { z } from "zod";

const WorkerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1).optional(),
    ADMIN_SEED_TOKEN: z.string().min(1).optional(),
    RATE_LIMIT_BACKEND: z.enum(["redis", "memory"]).optional(),
    LOG_LEVEL: z.string().default("info"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REDIS_URL"],
        message: "REDIS_URL is required in production",
      });
    }
  });

const parsed = WorkerEnvSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid worker environment: ${details}`);
}

export const workerEnv = parsed.data;
