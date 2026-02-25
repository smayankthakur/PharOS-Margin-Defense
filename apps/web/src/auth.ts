import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { LoginSchema } from "@pharos/shared";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const res = await fetch(`${process.env.API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          tenantId: data.user.tenantId,
          apiToken: data.token,
        } as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.apiToken = (user as any).apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).tenantId = token.tenantId;
      (session as any).apiToken = token.apiToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
