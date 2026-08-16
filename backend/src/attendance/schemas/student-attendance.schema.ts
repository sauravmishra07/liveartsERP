import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { StudentAttendanceStatus } from '../../common/enums';

export type StudentAttendanceDocument = HydratedDocument<StudentAttendance>;

@Schema({ timestamps: true })
export class StudentAttendance {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId: Types.ObjectId;

  // Stored at IST-midnight (see AttendanceService) so (studentId, date) is one-per-day.
  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: String, enum: Object.values(StudentAttendanceStatus), required: true })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Batch', index: true })
  batchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const StudentAttendanceSchema = SchemaFactory.createForClass(StudentAttendance);
// Duplicate protection: at most one attendance record per student per day.
StudentAttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
