import { apiEnv } from "@/env";

const api = apiEnv.API_URL;
const seedToken = apiEnv.ADMIN_SEED_TOKEN;

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
