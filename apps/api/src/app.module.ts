import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { SkusController } from "./skus/skus.controller";
import { DealersController } from "./dealers/dealers.controller";
import { CompetitorsController } from "./competitors/competitors.controller";
import { SalesController } from "./sales/sales.controller";
import { SnapshotsController } from "./snapshots/snapshots.controller";
import { AlertsController } from "./alerts/alerts.controller";
import { TasksController } from "./tasks/tasks.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
      },
    }),
    AuthModule,
  ],
  controllers: [
    HealthController,
    SkusController,
    DealersController,
    CompetitorsController,
    SalesController,
    SnapshotsController,
    AlertsController,
    TasksController,
  ],
})
export class AppModule {}
