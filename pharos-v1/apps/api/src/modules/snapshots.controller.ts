import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { SnapshotBulkSchema } from "@pharos/shared";
import { CurrentUser } from "@/common/current-user";
import { Roles } from "@/common/roles.decorator";
import { ZodValidationPipe } from "@/common/zod.pipe";

@Controller("snapshots")
export class SnapshotsController {
  @Post("bulk")
  @Roles(Role.OWNER, Role.OPS)
  async bulk(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(SnapshotBulkSchema)) body: {
      rows: { competitorId: string; skuId: string; price: number; capturedAt: Date; url: string }[];
    },
  ) {
    const skuIds = [...new Set(body.rows.map((r) => r.skuId))];
    const competitorIds = [...new Set(body.rows.map((r) => r.competitorId))];
    const [skuCount, compCount] = await Promise.all([
      prisma.sku.count({ where: { tenantId: user.tenantId, id: { in: skuIds } } }),
      prisma.competitor.count({ where: { tenantId: user.tenantId, id: { in: competitorIds } } }),
    ]);
    if (skuCount !== skuIds.length || compCount !== competitorIds.length) {
      throw new BadRequestException("Invalid skuId or competitorId for tenant");
    }
    return prisma.competitorSnapshot.createMany({
      data: body.rows.map((row) => ({ ...row, tenantId: user.tenantId })),
    });
  }
}
