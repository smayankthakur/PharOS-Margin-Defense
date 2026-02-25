import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.url?.includes("/api/auth/login") || req.url?.includes("/api/health")) return true;
    if (!req.session?.tenantId) throw new UnauthorizedException("Missing tenant session");
    return true;
  }
}
