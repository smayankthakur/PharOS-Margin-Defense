import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { prisma } from "@pharos/db";
import argon2 from "argon2";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, password: string): Promise<{ token: string; session: { userId: string; tenantId: string; role: string; email: string } }> {
    const isDemoLogin = email.toLowerCase() === "demo@pharos.local";
    const user = await prisma.user.findFirst({
      where: isDemoLogin ? { email, tenant: { slug: "demo" } } : { email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const token = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return {
      token,
      session: {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      },
    };
  }
}
