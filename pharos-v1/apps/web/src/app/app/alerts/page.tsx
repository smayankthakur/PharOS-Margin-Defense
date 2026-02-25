import { apiFetch } from "@/lib/api";

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

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type?: string;
    severity?: string;
    q?: string;
    range?: "7d" | "30d";
    limit?: string;
    offset?: string;
  }>;
}) {
  const params = await searchParams;
  const limit = Math.max(1, Math.min(50, Number(params.limit ?? "20")));
  const offset = Math.max(0, Number(params.offset ?? "0"));

  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.severity) query.set("severity", params.severity);
  if (params.q) query.set("q", params.q);
  query.set("range", params.range ?? "30d");
  query.set("limit", String(limit));
  query.set("offset", String(offset));

  const allRows = (await apiFetch(`/alerts?${query.toString()}`)) as AlertRow[];
  const pagedRows = allRows.slice(offset, offset + limit);

  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < allRows.length;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-[var(--muted)]">
          Showing {allRows.length === 0 ? 0 : offset + 1}-{Math.min(offset + limit, allRows.length)} of{" "}
          {allRows.length}
        </p>
      </header>

      <form className="mt-3 flex flex-wrap gap-2 text-sm">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded border border-[var(--line)] bg-black/20 p-2"
        >
          <option value="">All Status</option>
          <option value="OPEN">OPEN</option>
          <option value="ACK">ACK</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="rounded border border-[var(--line)] bg-black/20 p-2"
        >
          <option value="">All Type</option>
          <option value="MAP">MAP</option>
          <option value="MRP">MRP</option>
          <option value="UNDERCUT">UNDERCUT</option>
          <option value="DEAD_STOCK">DEAD_STOCK</option>
        </select>
        <select
          name="severity"
          defaultValue={params.severity ?? ""}
          className="rounded border border-[var(--line)] bg-black/20 p-2"
        >
          <option value="">All Severity</option>
          <option value="LOW">LOW</option>
          <option value="MED">MED</option>
          <option value="HIGH">HIGH</option>
        </select>
        <select
          name="range"
          defaultValue={params.range ?? "30d"}
          className="rounded border border-[var(--line)] bg-black/20 p-2"
        >
          <option value="7d">7d</option>
          <option value="30d">30d</option>
        </select>
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search SKU / Dealer"
          className="rounded border border-[var(--line)] bg-black/20 p-2"
        />
        <input type="hidden" name="limit" value={String(limit)} />
        <input type="hidden" name="offset" value="0" />
        <button className="rounded border border-[var(--line)] px-3">Apply</button>
      </form>

      {pagedRows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">
          No alerts found for selected filters.
        </div>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr>
              <th>SKU</th>
              <th>Dealer/Competitor</th>
              <th>Type</th>
              <th>Severity</th>
              <th>₹ Impact</th>
              <th>Detected</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="py-2">
                  <a className="underline" href={`/app/alerts/${row.id}`}>
                    {row.sku?.skuCode ?? "SKU"}
                  </a>
                </td>
                <td>{row.dealer?.name ?? row.competitor?.name ?? "-"}</td>
                <td>{row.type}</td>
                <td>{row.severity}</td>
                <td>{Number(row.impactAmount).toFixed(2)}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        {hasPrev ? (
          <a
            className="rounded border border-[var(--line)] px-3 py-1"
            href={`/app/alerts?${buildPageQuery(params, limit, prevOffset)}`}
          >
            Previous
          </a>
        ) : (
          <span className="text-[var(--muted)]">Previous</span>
        )}
        {hasNext ? (
          <a
            className="rounded border border-[var(--line)] px-3 py-1"
            href={`/app/alerts?${buildPageQuery(params, limit, nextOffset)}`}
          >
            Next
          </a>
        ) : (
          <span className="text-[var(--muted)]">Next</span>
        )}
      </div>
    </main>
  );
}

function buildPageQuery(
  params: { status?: string; type?: string; severity?: string; q?: string; range?: "7d" | "30d" },
  limit: number,
  offset: number,
): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.severity) query.set("severity", params.severity);
  if (params.q) query.set("q", params.q);
  if (params.range) query.set("range", params.range);
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  return query.toString();
}
