import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { prisma, Role } from "@pharos/db";
import { SaleBulkSchema } from "@pharos/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("sales")
export class SalesController {
  @Post()
  @Roles(Role.OWNER, Role.SALES, Role.OPS)
  async bulk(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(SaleBulkSchema)) body: {
      rows: Array<{ skuId: string; dealerId: string; soldPrice: number; qty: number; soldAt: Date; orderRef: string }>;
    },
  ) {
    const skuIds = [...new Set(body.rows.map((row) => row.skuId))];
    const dealerIds = [...new Set(body.rows.map((row) => row.dealerId))];
    const [skuCount, dealerCount] = await Promise.all([
      prisma.sku.count({ where: { tenantId: user.tenantId, id: { in: skuIds } } }),
      prisma.dealer.count({ where: { tenantId: user.tenantId, id: { in: dealerIds } } }),
    ]);

    if (skuCount !== skuIds.length || dealerCount !== dealerIds.length) {
      throw new BadRequestException("Invalid skuId/dealerId for tenant");
    }

    return prisma.saleRow.createMany({
      data: body.rows.map((row) => ({ ...row, tenantId: user.tenantId })),
    });
  }
}
