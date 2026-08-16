import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FeesModule } from '../fees/fees.module';
import { PayrollModule } from '../payroll/payroll.module';
import { StudentsModule } from '../students/students.module';
import { JobsController } from './jobs.controller';
import { JobsScheduler } from './jobs.scheduler';
import { JobsService } from './jobs.service';

@Module({
  imports: [FeesModule, StudentsModule, AttendanceModule, PayrollModule, ExpensesModule],
  controllers: [JobsController],
  providers: [JobsService, JobsScheduler],
  exports: [JobsService],
})
export class JobsModule {}
