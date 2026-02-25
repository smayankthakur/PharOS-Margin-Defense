import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { SessionUser } from "./types";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.session as SessionUser;
});
