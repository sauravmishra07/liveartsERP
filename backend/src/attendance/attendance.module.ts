import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Batch, BatchSchema } from '../batches/schemas/batch.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import {
  StudentAttendance,
  StudentAttendanceSchema,
} from './schemas/student-attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Batch.name, schema: BatchSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService, MongooseModule],
})
export class AttendanceModule {}
