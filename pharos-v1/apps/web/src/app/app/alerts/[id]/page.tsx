import { revalidatePath } from "next/cache";
import { getServerEnv } from "@/env";
import { apiFetch, requireSession } from "@/lib/api";

type AlertDetail = {
  id: string;
  type: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK";
  status: "OPEN" | "ACK" | "RESOLVED";
  severity: "LOW" | "MED" | "HIGH";
  impactAmount: number;
  createdAt: string;
  sku: { skuCode: string; name: string } | null;
  dealer: { name: string } | null;
  competitor: { name: string } | null;
  ruleTriggered: string;
  mathBreakdown: Record<string, unknown>;
  timeline: { at: string; event: string }[];
  linkedEvidence: Record<string, unknown>;
  taskHistory: {
    id: string;
    title: string;
    status: "OPEN" | "IN_PROGRESS" | "DONE";
    createdAt: string;
  }[];
};

async function patchAlertStatus(formData: FormData) {
  "use server";
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  if (role === "VIEWER") return;

  const response = await fetch(`${getServerEnv().API_URL}/api/alerts/${formData.get("id")}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({ status: formData.get("status") }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Alert status update failed (${response.status})`);
  }
  revalidatePath(`/app/alerts/${formData.get("id")}`);
  revalidatePath("/app/alerts");
}

async function createLinkedTask(formData: FormData) {
  "use server";
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  if (role === "VIEWER") return;

  const response = await fetch(`${getServerEnv().API_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({
      title: formData.get("title"),
      slaDueAt: formData.get("slaDueAt"),
      alertId: formData.get("alertId"),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Task create failed (${response.status})`);
  }
  revalidatePath(`/app/alerts/${formData.get("alertId")}`);
  revalidatePath("/app/tasks");
}

function ruleText(type: AlertDetail["type"]): string {
  if (type === "MAP") return "Dealer sold below MAP threshold.";
  if (type === "MRP") return "Dealer sold below MRP threshold.";
  if (type === "UNDERCUT") return "Competitor price undercut MAP benchmark.";
  return "SKU inactive for 90+ days and marked dead stock.";
}

function suggestedActions(type: AlertDetail["type"]): string[] {
  if (type === "MAP" || type === "MRP") {
    return [
      "Call dealer and issue warning.",
      "Raise MAP/MRP reminder with order evidence.",
      "Track repeat incidents.",
    ];
  }
  if (type === "UNDERCUT") {
    return [
      "Adjust short-term promo band.",
      "Verify competitor listing and capture proof.",
      "Escalate pricing response to sales lead.",
    ];
  }
  return ["Prepare discount plan.", "Bundle slow SKU with high movers.", "Push inventory to alternate channel."];
}

function evidenceView(detail: AlertDetail) {
  const evidence = detail.linkedEvidence;
  if (detail.type === "MAP" || detail.type === "MRP") {
    return (
      <ul className="space-y-1 text-sm">
        <li>orderRef: {String(evidence.orderRef ?? "-")}</li>
        <li>soldAt: {String(evidence.soldAt ?? "-")}</li>
        <li>soldPrice: {String(evidence.soldPrice ?? "-")}</li>
        <li>qty: {String(evidence.qty ?? "-")}</li>
      </ul>
    );
  }
  if (detail.type === "UNDERCUT") {
    return (
      <ul className="space-y-1 text-sm">
        <li>competitor: {detail.competitor?.name ?? "-"}</li>
        <li>capturedAt: {String(evidence.capturedAt ?? "-")}</li>
        <li>price: {String(evidence.competitorPrice ?? "-")}</li>
        <li>
          url:{" "}
          {evidence.url ? (
            <a href={String(evidence.url)} target="_blank" rel="noreferrer" className="underline">
              {String(evidence.url)}
            </a>
          ) : (
            "-"
          )}
        </li>
      </ul>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      <li>lastSaleAt: {String(evidence.lastSaleAt ?? "-")}</li>
      <li>cost: {String(evidence.cost ?? "-")}</li>
      <li>onHandQty: {String(evidence.onHandQty ?? "-")}</li>
      <li>thresholdDays: {String(evidence.thresholdDays ?? 90)}</li>
    </ul>
  );
}

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  const { id } = await params;

  const detail = (await apiFetch(`/alerts/${id}`)) as AlertDetail;
  const canMutate = role === "OWNER" || role === "OPS" || role === "SALES";

  return (
    <main className="mx-auto max-w-5xl p-6">
      <a className="text-sm underline" href="/app/alerts">
        Back to alerts
      </a>

      <h1 className="mt-2 text-2xl font-semibold">
        {detail.type} | {detail.sku?.skuCode ?? "SKU"}
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Impact Rs {Number(detail.impactAmount).toFixed(2)} | Severity {detail.severity} | Status {detail.status}
      </p>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Rule Triggered</h2>
          <p className="mt-2 text-sm">{ruleText(detail.type)}</p>
          <h3 className="mt-3 text-sm font-semibold text-[var(--muted)]">Exact Math</h3>
          <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs">
            {JSON.stringify(detail.mathBreakdown, null, 2)}
          </pre>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-semibold">Suggested Actions</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {suggestedActions(detail.type).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Timeline</h2>
        {detail.timeline.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No timeline events.</p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            {detail.timeline.map((row, idx) => (
              <p key={`${row.event}-${idx}`}>
                {new Date(row.at).toLocaleString("en-IN")}: {row.event}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Linked Evidence</h2>
        <div className="mt-2">{evidenceView(detail)}</div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Task History</h2>
        {detail.taskHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No tasks linked to this alert.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {detail.taskHistory.map((task) => (
              <div key={task.id} className="rounded border border-[var(--line)] p-2 text-sm">
                <p>{task.title}</p>
                <p className="text-[var(--muted)]">
                  {task.status} | {new Date(task.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}

        {canMutate ? (
          <form action={createLinkedTask} className="mt-3 grid gap-2 md:grid-cols-3">
            <input type="hidden" name="alertId" value={detail.id} />
            <input
              name="title"
              required
              placeholder="Task title"
              className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm"
            />
            <input
              name="slaDueAt"
              type="date"
              required
              className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm"
            />
            <button className="rounded bg-[var(--ok)] px-3 py-2 text-sm font-semibold text-black">
              Create Task
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">Read-only role cannot create tasks.</p>
        )}
      </section>

      <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-semibold">Resolution Controls</h2>
        {canMutate ? (
          <form action={patchAlertStatus} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="id" value={detail.id} />
            <select
              name="status"
              defaultValue={detail.status}
              className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm"
            >
              <option value="OPEN">OPEN</option>
              <option value="ACK">ACK</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <button className="rounded border border-[var(--line)] px-3 py-2 text-sm">Update Status</button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">Read-only role cannot update alert status.</p>
        )}
      </section>
    </main>
  );
}
