import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EmployeeAttendanceStatus } from '../../common/enums';

export type EmployeeAttendanceDocument = HydratedDocument<EmployeeAttendance>;

@Schema({ timestamps: true })
export class EmployeeAttendance {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: String, enum: Object.values(EmployeeAttendanceStatus), required: true })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;
}

export const EmployeeAttendanceSchema = SchemaFactory.createForClass(EmployeeAttendance);
EmployeeAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
