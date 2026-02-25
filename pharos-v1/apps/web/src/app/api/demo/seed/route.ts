import { NextResponse } from "next/server";

export async function POST() {
  const apiUrl = process.env.API_URL;
  const seedToken = process.env.ADMIN_SEED_TOKEN;

  if (!apiUrl || !seedToken) {
    return NextResponse.json({ ok: false, error: "Demo seed env is not configured" }, { status: 500 });
  }

  const response = await fetch(`${apiUrl}/api/admin/seed?demo=true`, {
    method: "POST",
    headers: {
      "x-admin-seed-token": seedToken,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { ok: false, error: `Seed failed: ${response.status} ${text}` },
      { status: response.status },
    );
  }

  const payload = await response.json();
  return NextResponse.json({ ok: true, payload });
}
