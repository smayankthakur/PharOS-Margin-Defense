import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.apiToken) redirect("/login");

  return (
    <div className="min-h-screen">
      <nav className="border-b border-[var(--line)] bg-black/20 p-3 text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-6 rounded-full border border-[var(--line)] bg-black/30" />
            <a href="/app/dashboard">Dashboard</a>
            <a href="/app/alerts">Alerts</a>
            <a href="/app/tasks">Tasks</a>
          </div>
          <div className="text-[var(--muted)]">
            Tenant: {session.user.tenantId} | Role: {session.user.role}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
