import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerEnv } from "@/env";

type ApiLoginResponse = {
  token: string;
  session: {
    userId: string;
    tenantId: string;
    role: "OWNER" | "OPS" | "SALES" | "VIEWER";
    email: string;
  };
};

type AppUser = {
  id: string;
  email: string;
  role: "OWNER" | "OPS" | "SALES" | "VIEWER";
  tenantId: string;
  apiToken: string;
};

function resolveApiUrl(): string {
  return getServerEnv().API_URL;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      return body.message ?? body.error ?? "request failed";
    } catch {
      return "request failed";
    }
  }
  try {
    const text = await response.text();
    return text || "request failed";
  } catch {
    return "request failed";
  }
}

export const authOptions: NextAuthOptions = {
  secret: getServerEnv().NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("missing credentials");
        }

        const env = getServerEnv();
        const apiUrl = resolveApiUrl();
        const demoAlias = credentials.email === "__DEMO__" && credentials.password === "__DEMO__";
        const loginEmail = demoAlias ? env.DEMO_EMAIL : credentials.email;
        const loginPassword = demoAlias ? env.DEMO_PASSWORD : credentials.password;
        if (!loginEmail || !loginPassword) {
          throw new Error("missing credentials");
        }
        const isDemo = loginEmail.toLowerCase() === env.DEMO_EMAIL.toLowerCase();
        const endpoint = isDemo ? "/api/demo/login" : "/api/auth/login";

        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });

        if (!response.ok) {
          const message = await readErrorMessage(response);
          throw new Error(`auth failed (${response.status}): ${message}`);
        }

        const data = (await response.json()) as ApiLoginResponse | {
          ok: boolean;
          token: string;
          user: { id: string; role: "OWNER" | "OPS" | "SALES" | "VIEWER"; tenantId: string; email: string };
        };

        const apiToken = "token" in data ? data.token : "";
        if (!apiToken) {
          throw new Error("auth failed: missing token");
        }

        const sessionShape = "session" in data ? data.session : undefined;
        const userShape = "user" in data ? data.user : undefined;

        const user: AppUser = {
          id: sessionShape?.userId ?? userShape?.id ?? "",
          email: sessionShape?.email ?? userShape?.email ?? "",
          role: sessionShape?.role ?? userShape?.role ?? "VIEWER",
          tenantId: sessionShape?.tenantId ?? userShape?.tenantId ?? "",
          apiToken,
        };
        if (!user.id || !user.email || !user.tenantId) {
          throw new Error("auth failed: incomplete user payload");
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const appUser = user as unknown as AppUser;
        token.role = appUser.role;
        token.tenantId = appUser.tenantId;
        token.userId = appUser.id;
        token.apiToken = appUser.apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.role) session.user.role = token.role;
      if (token.tenantId) session.user.tenantId = token.tenantId;
      if (token.userId) session.user.id = token.userId;
      if (token.apiToken) session.apiToken = token.apiToken;
      return session;
    },
  },
};
