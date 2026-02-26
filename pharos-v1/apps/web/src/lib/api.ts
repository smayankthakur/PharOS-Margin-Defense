import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { getServerEnv } from "@/env";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.apiToken) {
    redirect("/login");
  }
  return session;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const session = await requireSession();
  const response = await fetch(`${getServerEnv().API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  return response.json();
}
