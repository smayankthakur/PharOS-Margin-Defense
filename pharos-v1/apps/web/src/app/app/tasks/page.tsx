import { revalidatePath } from "next/cache";
import { apiFetch, requireSession } from "@/lib/api";

type TaskRow = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  slaDueAt: string;
  assigneeUserId: string | null;
  alertId: string | null;
  alert: { id: string; type: string; skuId: string } | null;
};

type AlertOption = {
  id: string;
  sku: { skuCode: string; name: string } | null;
  type: "MAP" | "MRP" | "UNDERCUT" | "DEAD_STOCK";
  status: "OPEN" | "ACK" | "RESOLVED";
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN");
}

async function createTaskAction(formData: FormData) {
  "use server";
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  if (role === "VIEWER") return;

  const response = await fetch(`${process.env.API_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({
      title: formData.get("title"),
      slaDueAt: formData.get("slaDueAt") || undefined,
      alertId: formData.get("alertId") || undefined,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Task create failed (${response.status})`);
  }
  revalidatePath("/app/tasks");
}

async function patchTaskStatusAction(formData: FormData) {
  "use server";
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  if (role === "VIEWER") return;

  const response = await fetch(`${process.env.API_URL}/api/tasks/${formData.get("taskId")}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({
      status: formData.get("status"),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Task status update failed (${response.status})`);
  }
  revalidatePath("/app/tasks");
  revalidatePath("/app/dashboard");
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: "true" | "false" }>;
}) {
  const session = await requireSession();
  const role = session.user.role ?? "VIEWER";
  const params = await searchParams;
  const canSeeAll = role === "OWNER" || role === "OPS";
  const mineOnly = canSeeAll ? params.mine !== "false" : true;
  const canMutate = role === "OWNER" || role === "OPS" || role === "SALES";

  const [tasks, alertOptions] = await Promise.all([
    apiFetch(`/tasks?mine=${mineOnly ? "true" : "false"}`) as Promise<TaskRow[]>,
    apiFetch("/alerts?status=OPEN&range=30d") as Promise<AlertOption[]>,
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="flex gap-2 text-sm">
          <a className="rounded border border-[var(--line)] px-3 py-1" href="/app/tasks?mine=true">
            My Tasks
          </a>
          {canSeeAll ? (
            <a className="rounded border border-[var(--line)] px-3 py-1" href="/app/tasks?mine=false">
              All Tasks
            </a>
          ) : null}
        </div>
      </header>

      {canMutate ? (
        <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <summary className="cursor-pointer text-sm font-semibold">Create Task</summary>
          <form action={createTaskAction} className="mt-3 grid gap-2 md:grid-cols-3">
            <input
              name="title"
              required
              placeholder="Task title"
              className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm"
            />
            <input
              name="slaDueAt"
              type="date"
              className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm"
            />
            <select name="alertId" className="rounded border border-[var(--line)] bg-black/20 p-2 text-sm">
              <option value="">No linked alert</option>
              {alertOptions.map((alert) => (
                <option key={alert.id} value={alert.id}>
                  {alert.id.slice(0, 8)} | {alert.sku?.skuCode ?? "SKU"} | {alert.type}
                </option>
              ))}
            </select>
            <button className="rounded bg-[var(--ok)] px-3 py-2 text-sm font-semibold text-black md:col-span-3">
              Create Task
            </button>
          </form>
        </details>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">Read-only role cannot create tasks.</p>
      )}

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 text-sm text-[var(--muted)]">
          No tasks found.
        </div>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr>
              <th>Task</th>
              <th>SLA</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Linked Alert</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-[var(--line)]">
                <td className="py-2">{task.title}</td>
                <td>{formatDate(task.slaDueAt)}</td>
                <td>{task.assigneeUserId ? "Assigned" : "-"}</td>
                <td>{task.status}</td>
                <td>
                  {task.alertId ? (
                    <a className="underline" href={`/app/alerts/${task.alertId}`}>
                      Open Alert
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {canMutate ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={patchTaskStatusAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="IN_PROGRESS" />
                        <button className="rounded border border-[var(--line)] px-2 py-1 text-xs">
                          IN_PROGRESS
                        </button>
                      </form>
                      <form action={patchTaskStatusAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="status" value="DONE" />
                        <button className="rounded border border-[var(--line)] px-2 py-1 text-xs">DONE</button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">Read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
