import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { createTaskAction, resolveAlertAction } from "./actions";

function suggestedActions(type: string): string[] {
  if (type === "MAP") return ["Call dealer and issue MAP compliance warning.", "Freeze discount approvals for repeated orders."];
  if (type === "MRP") return ["Audit invoice policy for channel.", "Escalate pricing breach to sales head."];
  if (type === "UNDERCUT") return ["Run tactical promo guardrail.", "Negotiate dealer floor price with competitor evidence."];
  return ["Run dead stock liquidation plan.", "Bundle slow-moving SKU with high-volume lines."];
}

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const alert = await apiFetch(`/alerts/${id}`);
  if (!alert) {
    return <main className="p-10">Alert not found.</main>;
  }

  const evidence = alert.evidenceJson ? JSON.stringify(alert.evidenceJson, null, 2) : "{}";

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <Link href="/dashboard" className="text-sm underline">
        Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {alert.type} | {alert.sku?.skuCode}
      </h1>
      <p className="text-[var(--muted)]">
        Impact: ₹ {Number(alert.impactAmount).toFixed(2)} | Severity: {alert.severity} | Status: {alert.status}
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Rule Triggered & Math</h2>
          <p className="mt-2 text-sm">
            Rule: {alert.type} detection with deterministic impact calculation from shared pricing math.
          </p>
          <pre className="mt-3 overflow-auto rounded bg-black/30 p-2 text-xs">{evidence}</pre>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Suggested Actions</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {suggestedActions(alert.type).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Task History</h2>
        <div className="mt-2 space-y-2 text-sm">
          {alert.tasks?.length ? (
            alert.tasks.map((task: any) => (
              <div key={task.id} className="rounded border border-[var(--line)] p-2">
                {task.title} | {task.status}
              </div>
            ))
          ) : (
            <p className="text-[var(--muted)]">No tasks linked.</p>
          )}
        </div>

        <form action={createTaskAction} className="mt-4 grid gap-2 md:grid-cols-3">
          <input type="hidden" name="alertId" value={alert.id} />
          <input name="title" required placeholder="Task title" className="rounded border border-[var(--line)] bg-black/30 p-2 text-sm" />
          <input name="slaDueAt" type="date" required className="rounded border border-[var(--line)] bg-black/30 p-2 text-sm" />
          <button type="submit" className="rounded bg-[var(--good)] px-3 py-2 text-sm font-semibold text-black">
            Create Task
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Resolution Controls</h2>
        <form action={resolveAlertAction} className="mt-2 flex gap-2">
          <input type="hidden" name="alertId" value={alert.id} />
          <select name="status" className="rounded border border-[var(--line)] bg-black/30 p-2 text-sm">
            <option value="OPEN">OPEN</option>
            <option value="ACK">ACK</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <button type="submit" className="rounded border border-[var(--line)] px-3 py-2 text-sm">
            Update
          </button>
        </form>
      </section>
    </main>
  );
}
