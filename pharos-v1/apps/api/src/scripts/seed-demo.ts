const api = process.env.API_URL ?? "http://localhost:4000";
const seedToken = process.env.ADMIN_SEED_TOKEN;

if (!seedToken) {
  throw new Error("ADMIN_SEED_TOKEN is required");
}

const run = async (): Promise<void> => {
  const response = await fetch(`${api}/api/admin/seed?demo=true`, {
    method: "POST",
    headers: { "x-admin-seed-token": seedToken },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seed failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  process.stdout.write(JSON.stringify(data, null, 2));
};

void run();
