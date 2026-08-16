import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AttendanceModule } from './attendance/attendance.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { BranchesModule } from './branches/branches.module';
import { CrmModule } from './crm/crm.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { JobsModule } from './jobs/jobs.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { EmployeeAttendanceModule } from './employee-attendance/employee-attendance.module';
import { EmployeesModule } from './employees/employees.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FeesModule } from './fees/fees.module';
import { PayrollModule } from './payroll/payroll.module';
import { StudentsModule } from './students/students.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisModule } from './common/redis/redis.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    RedisModule,
    AuditModule,
    HealthModule,
    UsersModule,
    BranchesModule,
    AuthModule,
    EmployeesModule,
    BatchesModule,
    StudentsModule,
    AttendanceModule,
    FeesModule,
    EmployeeAttendanceModule,
    ExpensesModule,
    PayrollModule,
    WhatsAppModule,
    CrmModule,
    DashboardModule,
    JobsModule,
  ],
  providers: [
    // Global auth: every route requires a valid access token unless @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
