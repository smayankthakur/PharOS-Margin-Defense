"use server";

import { auth } from "@/auth";

export async function resolveAlertAction(formData: FormData) {
  const alertId = String(formData.get("alertId"));
  const status = String(formData.get("status"));
  const session = await auth();
  if (!session?.apiToken) return;

  await fetch(`${process.env.API_URL}/api/alerts/${alertId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });
}

export async function createTaskAction(formData: FormData) {
  const alertId = String(formData.get("alertId"));
  const title = String(formData.get("title"));
  const slaDueAt = String(formData.get("slaDueAt"));
  const session = await auth();
  if (!session?.apiToken) return;

  await fetch(`${process.env.API_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({ alertId, title, slaDueAt }),
    cache: "no-store",
  });
}
