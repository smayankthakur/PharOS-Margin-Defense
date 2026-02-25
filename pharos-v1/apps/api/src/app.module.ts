import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { LoggerModule } from "nestjs-pino";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { AlertsController } from "./modules/alerts.controller";
import { AdminController } from "./modules/admin.controller";
import { CompetitorsController } from "./modules/competitors.controller";
import { DealersController } from "./modules/dealers.controller";
import { HealthController } from "./modules/health.controller";
import { SalesController } from "./modules/sales.controller";
import { SkusController } from "./modules/skus.controller";
import { SnapshotsController } from "./modules/snapshots.controller";
import { TasksController } from "./modules/tasks.controller";

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: { level: process.env.LOG_LEVEL ?? "info" } }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-secret",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    SkusController,
    DealersController,
    CompetitorsController,
    SalesController,
    SnapshotsController,
    AlertsController,
    TasksController,
    AdminController,
  ],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
