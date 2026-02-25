import Link from "next/link";

type Alert = {
  id: string;
  type: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK";
  severity: "LOW" | "MED" | "HIGH";
  impactAmount: string;
  createdAt: string;
  status: "OPEN" | "ACK" | "RESOLVED";
  sku: { skuCode: string; name: string };
  dealer?: { name: string } | null;
  competitor?: { name: string } | null;
};

type Task = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  slaDueAt: string;
};

export function DashboardView({
  alerts,
  tasks,
  tenantName,
  windowLabel,
  currentSeverity,
  currentQuery,
}: {
  alerts: Alert[];
  tasks: Task[];
  tenantName: string;
  windowLabel: string;
  currentSeverity: string;
  currentQuery: string;
}) {
  const revenueLeak = alerts.reduce((acc, item) => acc + Number(item.impactAmount), 0);
  const mapCount = alerts.filter((a) => a.type === "MAP" && a.status !== "RESOLVED").length;
  const mrpCount = alerts.filter((a) => a.type === "MRP" && a.status !== "RESOLVED").length;
  const undercutCount = alerts.filter((a) => a.type === "UNDERCUT").length;
  const deadStock = alerts
    .filter((a) => a.type === "DEAD_STOCK")
    .reduce((acc, item) => acc + Number(item.impactAmount), 0);

  const trend = new Map<string, number>();
  for (const item of alerts) {
    const day = new Date(item.createdAt).toISOString().slice(0, 10);
    trend.set(day, (trend.get(day) ?? 0) + 1);
  }
  const trendRows = [...trend.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main className="p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{tenantName}</p>
          <h1 className="text-2xl font-semibold">PharOS Margin Defense</h1>
        </div>
        <form className="flex flex-wrap items-center gap-2 text-sm">
          <select name="range" defaultValue={windowLabel} className="rounded border border-[var(--line)] bg-black/30 p-2">
            <option value="7D">7D</option>
            <option value="30D">30D</option>
          </select>
          <select
            name="severity"
            defaultValue={currentSeverity}
            className="rounded border border-[var(--line)] bg-black/30 p-2"
          >
            <option value="">All Severity</option>
            <option value="LOW">LOW</option>
            <option value="MED">MED</option>
            <option value="HIGH">HIGH</option>
          </select>
          <input
            name="q"
            defaultValue={currentQuery}
            placeholder="Search SKU/Dealer"
            className="rounded border border-[var(--line)] bg-black/30 p-2"
          />
          <button className="rounded border border-[var(--line)] px-3 py-2">Apply</button>
        </form>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card title="Revenue Leak (30D)" value={`₹ ${revenueLeak.toFixed(2)}`} />
        <Card title="Active MAP Violations" value={String(mapCount)} />
        <Card title="Active MRP Violations" value={String(mrpCount)} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <Card title="Competitor Undercut Alerts" value={String(undercutCount)} />
        <Card title="Dead Stock Value (90+ days)" value={`₹ ${deadStock.toFixed(2)}`} />
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-sm text-[var(--muted)]">Breach Trend</p>
          <div className="mt-2 space-y-1 text-sm">
            {trendRows.map(([day, count]) => (
              <div key={day} className="flex justify-between">
                <span>{day}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Top Breaches</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[var(--muted)]">
              <tr>
                <th>SKU</th>
                <th>Dealer/Competitor</th>
                <th>Severity</th>
                <th>Impact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 10).map((a) => (
                <tr key={a.id} className="border-t border-[var(--line)]">
                  <td className="py-2">
                    <Link href={`/alerts/${a.id}`} className="underline">
                      {a.sku.skuCode}
                    </Link>
                  </td>
                  <td>{a.dealer?.name ?? a.competitor?.name ?? "-"}</td>
                  <td>{a.severity}</td>
                  <td>₹ {Number(a.impactAmount).toFixed(2)}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">My Tasks</h2>
          <div className="mt-3 space-y-2 text-sm">
            {tasks.slice(0, 10).map((task) => (
              <div key={task.id} className="rounded border border-[var(--line)] p-2">
                <p>{task.title}</p>
                <p className="text-[var(--muted)]">
                  {task.status} | Due {new Date(task.slaDueAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
