import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-10">
      <section className="mx-auto max-w-5xl rounded-xl border border-[var(--line)] bg-[var(--panel)] p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">PharOS Beta Command Center</p>
        <h1 className="mt-3 text-4xl font-semibold">Margin Defense / Price Intelligence OS</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          V1 tracks dealer MRP/MAP breaches, competitor undercut, and dead stock with deterministic revenue and margin impact.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="rounded-md bg-[var(--good)] px-4 py-2 font-semibold text-black">Open Dashboard</Link>
          <Link href="/login" className="rounded-md border border-[var(--line)] px-4 py-2">Login</Link>
        </div>
      </section>
    </main>
  );
}
