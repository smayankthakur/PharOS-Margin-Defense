import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

export const authOptions: NextAuthOptions = {
  ...(process.env.NEXTAUTH_SECRET ? { secret: process.env.NEXTAUTH_SECRET } : {}),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const demoAlias = credentials.email === "__DEMO__" && credentials.password === "__DEMO__";
        const loginEmail = demoAlias ? process.env.DEMO_EMAIL : credentials.email;
        const loginPassword = demoAlias ? process.env.DEMO_PASSWORD : credentials.password;
        if (!loginEmail || !loginPassword) return null;

        const response = await fetch(`${process.env.API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });

        if (!response.ok) return null;
        const data = (await response.json()) as ApiLoginResponse;

        const user: AppUser = {
          id: data.session.userId,
          email: data.session.email,
          role: data.session.role,
          tenantId: data.session.tenantId,
          apiToken: data.token,
        };
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
