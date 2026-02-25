import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const route = String(req.url ?? "");
    if ((req.method === "POST" && route.includes("/api/auth/login")) || route.includes("/api/health")) {
      return true;
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");

    try {
      const payload = await this.jwtService.verifyAsync(auth.substring(7), {
        secret: process.env.JWT_SECRET ?? "dev-secret",
      });
      req.session = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
