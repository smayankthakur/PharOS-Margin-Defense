import { Body, BadRequestException, Controller, ForbiddenException, Post, Query, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { prisma, Role } from "@pharos/db";
import { LoginSchema } from "@pharos/shared";
import argon2 from "argon2";
import { ZodValidationPipe } from "@/common/zod.pipe";

@Controller("demo")
export class DemoController {
  constructor(private readonly jwtService: JwtService) {}

  @Post("seed")
  async seedDemo(@Query("demo") demo = "true") {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("Demo seed endpoint is disabled in production");
    }
    if (demo !== "true") {
      throw new BadRequestException("Only demo=true is supported");
    }

    const tenant = await prisma.tenant.upsert({
      where: { slug: "demo" },
      update: { name: "PharOS Demo Tenant" },
      create: { slug: "demo", name: "PharOS Demo Tenant" },
    });
    const passwordHash = await argon2.hash("Demo@12345");
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "demo@pharos.local" } },
      update: { role: Role.OWNER, passwordHash },
      create: { tenantId: tenant.id, email: "demo@pharos.local", role: Role.OWNER, passwordHash },
    });

    const apiPort = process.env.API_PORT ?? "4000";
    const apiBaseUrl = process.env.API_URL ?? `http://localhost:${apiPort}`;
    const seedToken = process.env.ADMIN_SEED_TOKEN;
    if (!seedToken) {
      return { ok: true };
    }

    const response = await fetch(`${apiBaseUrl}/api/admin/seed?demo=true`, {
      method: "POST",
      headers: {
        "x-admin-seed-token": seedToken,
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      throw new BadRequestException(
        typeof body === "string" ? body : (body as { error?: string }).error ?? "Seed request failed",
      );
    }

    return { ok: true };
  }

  @Post("login")
  async loginDemo(@Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string }) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
    if (!tenant) {
      throw new UnauthorizedException("demo tenant not found, run reset demo data first");
    }

    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: body.email,
      },
    });
    if (!user) {
      throw new UnauthorizedException("invalid credentials");
    }

    const ok = await argon2.verify(user.passwordHash, body.password);
    if (!ok) {
      throw new UnauthorizedException("invalid credentials");
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return {
      ok: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        tenantId: user.tenantId,
        email: user.email,
      },
    };
  }
}
