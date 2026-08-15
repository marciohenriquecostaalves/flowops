import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './employees/employees.module';
import { ActivitiesModule } from './activities/activities.module';
import { DepartmentsModule } from './departments/departments.module';
import { ShiftsModule } from './shifts/shifts.module';
import { OperationsModule } from './operations/operations.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    ActivitiesModule,
    DepartmentsModule,
    ShiftsModule,
    OperationsModule,
    SettingsModule,
  ],
})
export class AppModule {}
