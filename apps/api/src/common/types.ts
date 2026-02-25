import { Role } from "@pharos/db";

export type SessionUser = {
  userId: string;
  tenantId: string;
  role: Role;
};
