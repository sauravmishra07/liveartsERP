import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { EmployeeAttendanceController } from './employee-attendance.controller';
import { EmployeeAttendanceService } from './employee-attendance.service';
import {
  EmployeeAttendance,
  EmployeeAttendanceSchema,
} from './schemas/employee-attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeAttendance.name, schema: EmployeeAttendanceSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [EmployeeAttendanceController],
  providers: [EmployeeAttendanceService],
  exports: [EmployeeAttendanceService, MongooseModule],
})
export class EmployeeAttendanceModule {}
