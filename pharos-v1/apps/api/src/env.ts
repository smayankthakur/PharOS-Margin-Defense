import { z } from "zod";

const ApiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1).optional(),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    ADMIN_SEED_TOKEN: z.string().min(1, "ADMIN_SEED_TOKEN is required"),
    RATE_LIMIT_BACKEND: z.enum(["redis", "memory"]).default("memory"),
    JWT_SECRET: z.string().min(1).default("dev-secret"),
    LOG_LEVEL: z.string().default("info"),
    API_URL: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      if (value.RATE_LIMIT_BACKEND !== "redis") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RATE_LIMIT_BACKEND"],
          message: "RATE_LIMIT_BACKEND must be 'redis' in production",
        });
      }
      if (!value.REDIS_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["REDIS_URL"],
          message: "REDIS_URL is required in production",
        });
      }
    }
  });

const parsed = ApiEnvSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid API environment: ${details}`);
}

export const apiEnv = {
  ...parsed.data,
  API_URL: parsed.data.API_URL ?? `http://localhost:${parsed.data.PORT}`,
};
