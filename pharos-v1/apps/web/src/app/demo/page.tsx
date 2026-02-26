"use client";

import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-credentials";
import { API_BASE_URL, getApiBaseUrlError } from "@/lib/env";

type Notice = { kind: "ok" | "error"; text: string } | null;

type SeedResult = { ok: true } | { ok: false; error: string };
type DemoLoginResult = { ok: true; token: string } | { ok: false; error: string };

function formatHttpError(status: number, statusText: string, detail?: string): string {
  const suffix = detail ? ` | ${detail}` : "";
  return `Request failed (${status} ${statusText})${suffix}`;
}

async function readResponseBody(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      return payload.error ?? payload.message;
    } catch {
      return undefined;
    }
  }
  try {
    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function assertBackendHealthy(): Promise<SeedResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: getApiBaseUrlError() ?? "NEXT_PUBLIC_API_URL is required in production." };
  }

  try {
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`, { method: "GET" });
    if (!healthResponse.ok) {
      const detail = await readResponseBody(healthResponse);
      return {
        ok: false,
        error: `${formatHttpError(healthResponse.status, healthResponse.statusText, detail)}. Backend not running. Start with: pnpm dev`,
      };
    }

    const body = (await healthResponse.json()) as { ok?: boolean };
    if (!body.ok) {
      return { ok: false, error: "Backend health check failed. Backend not running. Start with: pnpm dev" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Backend not running. Start with: pnpm dev" };
  }
}

async function seedDemo(): Promise<SeedResult> {
  const health = await assertBackendHealthy();
  if (!health.ok) {
    return health;
  }

  if (!API_BASE_URL) {
    return { ok: false, error: getApiBaseUrlError() ?? "NEXT_PUBLIC_API_URL is required in production." };
  }

  let seedResponse: Response;
  try {
    seedResponse = await fetch(`${API_BASE_URL}/api/demo/seed?demo=true`, { method: "POST" });
  } catch {
    return { ok: false, error: "Backend not running. Start with: pnpm dev" };
  }

  if (!seedResponse.ok) {
    const detail = await readResponseBody(seedResponse);
    return {
      ok: false,
      error: formatHttpError(seedResponse.status, seedResponse.statusText, detail),
    };
  }

  const seedPayload = (await seedResponse.json()) as { ok?: boolean; error?: string };
  if (!seedPayload.ok) {
    return { ok: false, error: seedPayload.error ?? "Seed failed" };
  }
  return { ok: true };
}

async function loginDemo(): Promise<DemoLoginResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: getApiBaseUrlError() ?? "NEXT_PUBLIC_API_URL is required in production." };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/demo/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
  } catch {
    return { ok: false, error: "Demo login failed (503): backend unreachable" };
  }

  if (!response.ok) {
    const detail = await readResponseBody(response);
    const message = detail ?? "unknown error";
    return {
      ok: false,
      error: `Demo login failed (${response.status} ${response.statusText}): ${message}`,
    };
  }

  const payload = (await response.json()) as { ok?: boolean; token?: string; message?: string };
  if (!payload.ok || !payload.token) {
    return { ok: false, error: "Demo login failed (500): invalid server response" };
  }

  return { ok: true, token: payload.token };
}

export default function DemoPage() {
  const [notice, setNotice] = useState<Notice>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  return (
    <main className="min-h-screen p-8 md:p-12">
      <section className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">PharOS Beta Command Center</p>
        <h1 className="mt-3 text-4xl font-semibold">Margin Defense / Price Intelligence OS</h1>

        <ul className="mt-5 list-disc space-y-2 pl-6 text-sm text-[var(--muted)]">
          <li>Detect MAP/MRP dealer breaches with impact in INR.</li>
          <li>Track competitor undercut from snapshots already captured in DB.</li>
          <li>Surface dead stock risk from 90+ day inactivity.</li>
        </ul>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            disabled={isEntering}
            className="rounded bg-[var(--ok)] px-5 py-2 font-semibold text-black disabled:opacity-60"
            onClick={async () => {
              setIsEntering(true);
              setNotice(null);
              try {
                const existingSession = await getSession();
                if (!existingSession) {
                  const seed = await seedDemo();
                  if (!seed.ok) {
                    setNotice({ kind: "error", text: seed.error ?? "Reset failed" });
                    return;
                  }
                }

                const apiLogin = await loginDemo();
                if (!apiLogin.ok) {
                  const hint = apiLogin.error.includes("invalid credentials")
                    ? `${apiLogin.error}. Run Reset Demo Data first.`
                    : apiLogin.error;
                  setNotice({ kind: "error", text: hint });
                  return;
                }
                localStorage.setItem("pharosDemoToken", apiLogin.token);

                const result = await signIn("credentials", {
                  email: DEMO_EMAIL,
                  password: DEMO_PASSWORD,
                  redirect: false,
                });
                if (!result?.ok) {
                  const message =
                    result?.error && result.error !== "CredentialsSignin"
                      ? result.error
                      : "Invalid demo credentials or backend unreachable. Run Reset Demo Data and ensure API is running on 4000.";
                  setNotice({ kind: "error", text: `Demo login failed: ${message}` });
                  return;
                }
                window.location.href = "/app/dashboard";
              } catch {
                setNotice({ kind: "error", text: "Enter Demo failed. Check API/web env and retry." });
              } finally {
                setIsEntering(false);
              }
            }}
          >
            {isEntering ? "Entering..." : "Enter Demo"}
          </button>

          <button
            disabled={isResetting}
            className="rounded border border-[var(--line)] px-5 py-2 disabled:opacity-60"
            onClick={async () => {
              setIsResetting(true);
              setNotice(null);
              try {
                const result = await seedDemo();
                if (!result.ok) {
                  setNotice({ kind: "error", text: result.error ?? "Reset failed" });
                  return;
                }
                setNotice({ kind: "ok", text: "Demo data reset complete." });
              } catch {
                setNotice({ kind: "error", text: "Reset failed. API may be unreachable." });
              } finally {
                setIsResetting(false);
              }
            }}
          >
            {isResetting ? "Resetting..." : "Reset Demo Data"}
          </button>
        </div>

        {notice ? (
          <p className={`mt-4 text-sm ${notice.kind === "ok" ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>
            {notice.text}
          </p>
        ) : null}
      </section>
    </main>
  );
}
