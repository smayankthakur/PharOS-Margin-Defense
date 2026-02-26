import { revalidatePath } from "next/cache";
import { getServerEnv } from "@/env";
import { apiFetch, requireSession } from "@/lib/api";

type AlertRow = {
  id: string;
  type: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK";
  severity: "LOW" | "MED" | "HIGH";
  status: "OPEN" | "ACK" | "RESOLVED";
  impactAmount: number;
  createdAt: string;
  sku: { skuCode: string; name: string } | null;
  dealer: { name: string } | null;
  competitor: { name: string } | null;
};

type TaskRow = {
  id: string;
  title: string;
  slaDueAt: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  assigneeUserId: string | null;
  alertId: string | null;
};

function linePoints(values: number[]): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN");
}

async function patchTaskStatus(formData: FormData) {
  "use server";
  const session = await requireSession();
  if (session.user.role === "VIEWER") return;

  const response = await fetch(`${getServerEnv().API_URL}/api/tasks/${formData.get("taskId")}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({ status: formData.get("status") }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Task update failed (${response.status})`);
  }
  revalidatePath("/app/dashboard");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: "7d" | "30d";
    severity?: "LOW" | "MED" | "HIGH";
    q?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const selectedRange = params.range ?? "30d";
  const selectedSeverity = params.severity ?? "";
  const selectedQuery = params.q ?? "";
  const role = session.user.role ?? "VIEWER";

  const rangeQuery = new URLSearchParams();
  rangeQuery.set("range", selectedRange);
  if (selectedSeverity) rangeQuery.set("severity", selectedSeverity);
  if (selectedQuery) rangeQuery.set("q", selectedQuery);

  const [alerts, open30dAlerts, myTasks] = await Promise.all([
    apiFetch(`/alerts?${rangeQuery.toString()}`) as Promise<AlertRow[]>,
    apiFetch("/alerts?status=OPEN&range=30d") as Promise<AlertRow[]>,
    apiFetch("/tasks?mine=true") as Promise<TaskRow[]>,
  ]);

  // Revenue Leak uses OPEN MAP/MRP/UNDERCUT in 30d (explicitly excluding DEAD_STOCK).
  const revenueLeak = open30dAlerts
    .filter((row) => row.type !== "DEAD_STOCK")
    .reduce((sum, row) => sum + Number(row.impactAmount), 0);
  const activeMap = alerts.filter((row) => row.status === "OPEN" && row.type === "MAP").length;
  const activeMrp = alerts.filter((row) => row.status === "OPEN" && row.type === "MRP").length;
  const undercutCount = alerts.filter((row) => row.status === "OPEN" && row.type === "UNDERCUT").length;
  const deadStockValue = alerts
    .filter((row) => row.status === "OPEN" && row.type === "DEAD_STOCK")
    .reduce((sum, row) => sum + Number(row.impactAmount), 0);

  const byDay = new Map<string, number>();
  for (const row of alerts) {
    const day = new Date(row.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const orderedDays = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const trendSeries = orderedDays.map((entry) => entry[1]);
  const trendPolyline = linePoints(trendSeries);

  const topBreaches = [...alerts].sort((a, b) => Number(b.impactAmount) - Number(a.impactAmount)).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-[var(--line)] bg-black/20" />
          <div>
            <p className="text-sm text-[var(--muted)]">{session.user.tenantId ?? "Tenant"}</p>
            <h1 className="text-2xl font-semibold">PharOS Margin Defense</h1>
          </div>
        </div>

        <form className="flex flex-wrap gap-2 text-sm">
          <select
            className="rounded border border-[var(--line)] bg-black/20 p-2"
            name="range"
            defaultValue={selectedRange}
          >
            <option value="7d">7D</option>
            <option value="30d">30D</option>
          </select>
          <select
            className="rounded border border-[var(--line)] bg-black/20 p-2"
            name="severity"
            defaultValue={selectedSeverity}
          >
            <option value="">ALL</option>
            <option value="LOW">LOW</option>
            <option value="MED">MED</option>
            <option value="HIGH">HIGH</option>
          </select>
          <input
            className="rounded border border-[var(--line)] bg-black/20 p-2"
            name="q"
            defaultValue={selectedQuery}
            placeholder="Search SKU / Dealer"
          />
          <button className="rounded border border-[var(--line)] px-3">Apply</button>
        </form>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <KpiCard title="Revenue Leak (30D)" value={`Rs ${revenueLeak.toFixed(2)}`} />
        <KpiCard title="Active MAP Violations" value={String(activeMap)} />
        <KpiCard title="Active MRP Violations" value={String(activeMrp)} />
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-3">
        <KpiCard title="Competitor Undercut Alerts" value={String(undercutCount)} />
        <KpiCard title="Dead Stock Value (90+ days)" value={`Rs ${deadStockValue.toFixed(2)}`} />
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-sm text-[var(--muted)]">Breach Trend</p>
          {orderedDays.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No alert trend for selected range.</p>
          ) : (
            <svg viewBox="0 0 100 100" className="mt-3 h-28 w-full rounded bg-black/20">
              <polyline fill="none" stroke="#38c172" strokeWidth="2" points={trendPolyline} />
            </svg>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Top Breaches</h2>
          {topBreaches.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No alerts found for selected filters.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th>SKU</th>
                  <th>Dealer/Competitor</th>
                  <th>Severity</th>
                  <th>Rs Impact</th>
                  <th>Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topBreaches.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="py-2">
                      <a className="underline" href={`/app/alerts/${row.id}`}>
                        {row.sku?.skuCode ?? "SKU"}
                      </a>
                    </td>
                    <td>{row.dealer?.name ?? row.competitor?.name ?? "-"}</td>
                    <td>{row.severity}</td>
                    <td>{Number(row.impactAmount).toFixed(2)}</td>
                    <td>{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">My Tasks</h2>
          {myTasks.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No tasks assigned.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-[var(--muted)]">
                <tr>
                  <th>Task</th>
                  <th>SLA</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.slice(0, 10).map((task) => (
                  <tr key={task.id} className="border-t border-[var(--line)]">
                    <td className="py-2">{task.title}</td>
                    <td>{formatDate(task.slaDueAt)}</td>
                    <td>{task.assigneeUserId ? "Assigned" : "-"}</td>
                    <td>{task.status}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        {role === "VIEWER" ? (
                          <span className="text-[var(--muted)]">Read-only</span>
                        ) : (
                          <>
                            <form action={patchTaskStatus}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <input type="hidden" name="status" value="IN_PROGRESS" />
                              <button className="rounded border border-[var(--line)] px-2 py-1 text-xs">
                                Mark IN_PROGRESS
                              </button>
                            </form>
                            <form action={patchTaskStatus}>
                              <input type="hidden" name="taskId" value={task.id} />
                              <input type="hidden" name="status" value="DONE" />
                              <button className="rounded border border-[var(--line)] px-2 py-1 text-xs">
                                Mark DONE
                              </button>
                            </form>
                          </>
                        )}
                        {task.alertId ? (
                          <a className="underline text-xs" href={`/app/alerts/${task.alertId}`}>
                            Open alert
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
