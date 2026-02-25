import { auth } from "@/auth";

export async function apiFetch(path: string, init?: RequestInit) {
  const session = await auth();
  const token = session?.apiToken;
  if (!token) throw new Error("Unauthenticated");

  const response = await fetch(`${process.env.API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
