import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentAttendance, StudentAttendanceSchema } from '../attendance/schemas/student-attendance.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { FeeCalcService } from './fee-calc.service';
import { FeeEngineService } from './fee-engine.service';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeeRecord, FeeRecordSchema } from './schemas/fee-record.schema';

@Module({
  imports: [
    WhatsAppModule,
    MongooseModule.forFeature([
      { name: FeeRecord.name, schema: FeeRecordSchema },
      { name: Student.name, schema: StudentSchema },
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
    ]),
  ],
  controllers: [FeesController],
  providers: [FeesService, FeeCalcService, FeeEngineService],
  exports: [FeesService, FeeEngineService, MongooseModule],
})
export class FeesModule {}
