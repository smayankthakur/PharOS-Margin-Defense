import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <form action={loginAction} className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h1 className="text-xl font-semibold">Login to PharOS</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Use seeded demo credentials after running `/api/admin/seed`.</p>
        <label className="mt-4 block text-sm">Email</label>
        <input className="mt-1 w-full rounded border border-[var(--line)] bg-black/30 p-2" name="email" type="email" required />
        <label className="mt-4 block text-sm">Password</label>
        <input className="mt-1 w-full rounded border border-[var(--line)] bg-black/30 p-2" name="password" type="password" required />
        <button className="mt-5 w-full rounded bg-[var(--good)] py-2 font-semibold text-black" type="submit">Sign In</button>
      </form>
    </main>
  );
}
