"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <form
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setLoading(true);
          const form = new FormData(event.currentTarget);
          try {
            const result = await signIn("credentials", {
              email: form.get("email"),
              password: form.get("password"),
              redirect: false,
            });
            if (!result?.ok) {
              setError("Invalid credentials");
              return;
            }
            window.location.href = "/app/dashboard";
          } finally {
            setLoading(false);
          }
        }}
      >
        <h1 className="text-xl font-semibold">Login to PharOS</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Use manual credentials or open Demo Mode.</p>

        <label className="mt-4 block text-sm">Email</label>
        <input
          className="mt-1 w-full rounded border border-[var(--line)] bg-black/20 p-2"
          name="email"
          type="email"
          required
        />

        <label className="mt-3 block text-sm">Password</label>
        <input
          className="mt-1 w-full rounded border border-[var(--line)] bg-black/20 p-2"
          name="password"
          type="password"
          required
        />

        {error ? <p className="mt-3 text-sm text-[var(--bad)]">{error}</p> : null}

        <button
          disabled={loading}
          className="mt-4 w-full rounded bg-[var(--ok)] py-2 font-semibold text-black disabled:opacity-60"
          type="submit"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <a href="/demo" className="mt-4 block text-center text-sm underline">
          Open Demo Mode
        </a>
      </form>
    </main>
  );
}
