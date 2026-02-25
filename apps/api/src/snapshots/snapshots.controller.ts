import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { SnapshotBulkSchema } from "@pharos/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("snapshots")
export class SnapshotsController {
  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async bulk(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(SnapshotBulkSchema)) body: {
      rows: Array<{ competitorId: string; skuId: string; price: number; capturedAt: Date; url: string }>;
    },
  ) {
    const skuIds = [...new Set(body.rows.map((row) => row.skuId))];
    const competitorIds = [...new Set(body.rows.map((row) => row.competitorId))];
    const [skuCount, competitorCount] = await Promise.all([
      prisma.sku.count({ where: { tenantId: user.tenantId, id: { in: skuIds } } }),
      prisma.competitor.count({ where: { tenantId: user.tenantId, id: { in: competitorIds } } }),
    ]);

    if (skuCount !== skuIds.length || competitorCount !== competitorIds.length) {
      throw new BadRequestException("Invalid skuId/competitorId for tenant");
    }

    return prisma.competitorSnapshot.createMany({
      data: body.rows.map((row) => ({ ...row, tenantId: user.tenantId })),
    });
  }
}
