import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentAttendance, StudentAttendanceSchema } from '../attendance/schemas/student-attendance.schema';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentStatusService } from './student-status.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService, StudentStatusService],
  exports: [StudentsService, StudentStatusService, MongooseModule],
})
export class StudentsModule {}
