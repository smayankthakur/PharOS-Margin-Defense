import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

const ServerEnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  API_URL: z.string().url("API_URL must be a valid URL"),
  ADMIN_SEED_TOKEN: z.string().min(1, "ADMIN_SEED_TOKEN is required"),
  DEMO_EMAIL: z.string().email("DEMO_EMAIL must be an email"),
  DEMO_PASSWORD: z.string().min(1, "DEMO_PASSWORD is required"),
});

export function getPublicEnv(): { API_BASE_URL: string; error?: string } {
  const parsed = PublicEnvSchema.safeParse(process.env);
  const configured = parsed.success ? parsed.data.NEXT_PUBLIC_API_URL : undefined;
  const fallback = nodeEnv === "development" ? "http://localhost:4000" : "";
  const API_BASE_URL = configured ?? fallback;

  if (!API_BASE_URL) {
    return {
      API_BASE_URL,
      error: "NEXT_PUBLIC_API_URL is required in production.",
    };
  }

  return { API_BASE_URL };
}

export function getServerEnv(): z.infer<typeof ServerEnvSchema> {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid web server environment: ${details}`);
  }
  return parsed.data;
}

export function getNextAuthSecretForMiddleware(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (nodeEnv === "development") return "dev_secret_change_me";
  throw new Error("NEXTAUTH_SECRET is required");
}
