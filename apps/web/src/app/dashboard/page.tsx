import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardView } from "@/components/dashboard";
import { apiFetch } from "@/lib/api";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const windowDays = params.range === "7D" ? 7 : 30;
  const severity = typeof params.severity === "string" ? params.severity : "";
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const type = typeof params.type === "string" ? params.type : "";

  const query = new URLSearchParams();
  if (severity) query.set("severity", severity);
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (type) query.set("type", type);

  const alerts = await apiFetch(`/alerts?${query.toString()}`);
  const tasks = await apiFetch("/tasks");

  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const filteredAlerts = alerts.filter((a: any) => new Date(a.createdAt).getTime() >= cutoff);

  return (
    <DashboardView
      alerts={filteredAlerts}
      tasks={tasks}
      tenantName={session.user.tenantId ?? "Tenant"}
      windowLabel={windowDays === 7 ? "7D" : "30D"}
      currentSeverity={severity}
      currentQuery={q}
    />
  );
}
