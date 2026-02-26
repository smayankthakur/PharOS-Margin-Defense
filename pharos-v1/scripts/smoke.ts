const baseUrl = process.env.API_URL ?? "http://localhost:4000";
const seedToken = process.env.ADMIN_SEED_TOKEN ?? "local_seed_token";
const demoEmail = process.env.DEMO_EMAIL ?? "demo@pharos.local";
const demoPassword = process.env.DEMO_PASSWORD ?? "Demo@12345";

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON, received: ${text}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

async function assertOk(response: Response, label: string): Promise<Record<string, unknown>> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed (${response.status} ${response.statusText}): ${body}`);
  }
  return parseJson(response);
}

async function run(): Promise<void> {
  const health = await assertOk(await fetch(`${baseUrl}/health`), "health");
  if (health.ok !== true) {
    throw new Error("health response missing ok=true");
  }

  await assertOk(
    await fetch(`${baseUrl}/api/admin/seed?demo=true`, {
      method: "POST",
      headers: { "x-admin-seed-token": seedToken },
    }),
    "seed",
  );

  const login = await assertOk(
    await fetch(`${baseUrl}/api/demo/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demoEmail, password: demoPassword }),
    }),
    "login",
  );
  const token = login.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("login response missing token");
  }

  await assertOk(
    await fetch(`${baseUrl}/api/alerts?status=OPEN&range=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    "alerts",
  );

  await assertOk(
    await fetch(`${baseUrl}/api/tasks?mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    "tasks",
  );

  process.stdout.write("Smoke test passed\n");
}

void run();
