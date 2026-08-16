import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';
import { DepartmentsModule } from './departments/departments.module';
import { ShiftsModule } from './shifts/shifts.module';
import { OperationsModule } from './operations/operations.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { JobTitlesModule } from './job-titles/job-titles.module';
import { ReportsModule } from './reports/reports.module';
import { HistoryModule } from './history/history.module';
import { RequestLoggingMiddleware } from './observability/request-logging.middleware';
import { KiosksModule } from './kiosks/kiosks.module';
import { BusinessUnitsModule } from './business-units/business-units.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    ActivitiesModule,
    DepartmentsModule,
    ShiftsModule,
    OperationsModule,
    SettingsModule,
    UsersModule,
    JobTitlesModule,
    ReportsModule,
    HistoryModule,
    KiosksModule,
    BusinessUnitsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
