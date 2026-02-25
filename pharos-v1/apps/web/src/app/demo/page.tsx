"use client";

import { getSession, signIn } from "next-auth/react";
import { useState } from "react";

type Notice = { kind: "ok" | "error"; text: string } | null;

async function seedDemo(): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch("/api/demo/seed", { method: "POST" });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    return { ok: false, error: data.error ?? "Seed failed" };
  }
  return { ok: true };
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

                const result = await signIn("credentials", {
                  email: "__DEMO__",
                  password: "__DEMO__",
                  redirect: false,
                });
                if (!result?.ok) {
                  setNotice({ kind: "error", text: "Demo login failed" });
                  return;
                }
                window.location.href = "/app/dashboard";
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
