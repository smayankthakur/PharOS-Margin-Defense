import "next-auth";

declare module "next-auth" {
  interface Session {
    apiToken?: string;
    user: {
      id?: string;
      email?: string | null;
      role?: "OWNER" | "OPS" | "SALES" | "VIEWER";
      tenantId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER" | "OPS" | "SALES" | "VIEWER";
    tenantId?: string;
    userId?: string;
    apiToken?: string;
  }
}
