import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { apiEnv } from "@/env";

type AuthPayload = {
  sub: string;
  tenantId: string;
  role: "OWNER" | "OPS" | "SALES" | "VIEWER";
  email: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const url = String(req.url ?? "");

    if (
      url.includes("/health") ||
      url.includes("/api/health") ||
      (req.method === "POST" && url.includes("/api/auth/login")) ||
      (req.method === "POST" && url.includes("/api/admin/seed")) ||
      (req.method === "POST" && url.includes("/api/demo/seed")) ||
      (req.method === "POST" && url.includes("/api/demo/login"))
    ) {
      return true;
    }

    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = auth.slice(7);
    let payload: AuthPayload;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: apiEnv.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    req.user = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };

    return true;
  }
}
