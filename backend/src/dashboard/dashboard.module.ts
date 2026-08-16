import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StudentAttendance,
  StudentAttendanceSchema,
} from '../attendance/schemas/student-attendance.schema';
import { Batch, BatchSchema } from '../batches/schemas/batch.schema';
import { Enquiry, EnquirySchema } from '../crm/schemas/enquiry.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { FeeRecord, FeeRecordSchema } from '../fees/schemas/fee-record.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: FeeRecord.name, schema: FeeRecordSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: Enquiry.name, schema: EnquirySchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
