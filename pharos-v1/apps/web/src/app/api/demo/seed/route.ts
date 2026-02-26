import { NextResponse } from "next/server";
import { getServerEnv } from "@/env";

export async function HEAD() {
  const { API_URL: apiUrl } = getServerEnv();
  try {
    const response = await fetch(`${apiUrl}/health`, { method: "GET", cache: "no-store" });
    if (!response.ok) {
      return new Response(null, { status: response.status, statusText: response.statusText });
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 502, statusText: "API unreachable" });
  }
}

export async function POST() {
  const { API_URL: apiUrl, ADMIN_SEED_TOKEN: seedToken } = getServerEnv();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/admin/seed?demo=true`, {
      method: "POST",
      headers: {
        "x-admin-seed-token": seedToken,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Seed request failed: API is unreachable" }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { ok: false, error: `Seed failed: ${response.status} ${text}` },
      { status: response.status },
    );
  }

  try {
    const payload = await response.json();
    return NextResponse.json({ ok: true, payload });
  } catch {
    return NextResponse.json({ ok: false, error: "Seed failed: invalid API response" }, { status: 502 });
  }
}
