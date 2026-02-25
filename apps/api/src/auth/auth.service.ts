import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { prisma } from "@pharos/db";
import argon2 from "argon2";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findFirst({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await argon2.verify(user.passwordHash, input.password);
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
      },
    };
  }
}
