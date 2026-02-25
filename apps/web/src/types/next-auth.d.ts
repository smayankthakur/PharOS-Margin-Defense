import "next-auth";

declare module "next-auth" {
  interface Session {
    apiToken?: string;
    user: {
      id?: string;
      email?: string | null;
      role?: string;
      tenantId?: string;
    };
  }
}
