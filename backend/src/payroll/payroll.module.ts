import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeAttendance, EmployeeAttendanceSchema } from '../employee-attendance/schemas/employee-attendance.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { FeeRecord, FeeRecordSchema } from '../fees/schemas/fee-record.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeAttendance.name, schema: EmployeeAttendanceSchema },
      { name: Student.name, schema: StudentSchema },
      { name: FeeRecord.name, schema: FeeRecordSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
