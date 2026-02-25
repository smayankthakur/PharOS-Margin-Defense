import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Role } from "@pharos/db";

export type SessionUser = {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
};

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user as SessionUser;
});
