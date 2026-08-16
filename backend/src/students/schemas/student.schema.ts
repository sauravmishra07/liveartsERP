import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ActiveStatus,
  FeeType,
  LatestPaymentStatus,
  OverdueThisMonth,
  StudentStatus,
} from '../../common/enums';
import {
  PersonName,
  PersonNameSchema,
} from '../../common/schemas/person-name.schema';

export type StudentDocument = HydratedDocument<Student>;

@Schema({ timestamps: true })
export class Student {
  // --- Official ---
  @Prop({ type: Number, index: true })
  formNo?: number;

  @Prop({
    type: String,
    enum: Object.values(ActiveStatus),
    default: ActiveStatus.ACTIVE,
    index: true,
  })
  activeStatus: ActiveStatus;

  @Prop({
    type: String,
    enum: Object.values(StudentStatus),
    default: StudentStatus.DEMO,
    index: true,
  })
  studentStatus: StudentStatus;

  @Prop() enterDate?: Date;
  @Prop() reminderDate?: Date;
  @Prop() studentStatusRemarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Batch', index: true })
  batchId?: Types.ObjectId;

  @Prop({ required: true })
  joiningDate: Date;

  @Prop() actualJoiningDate?: Date;

  // --- Personal ---
  @Prop() photo?: string;

  @Prop({ type: PersonNameSchema, required: true })
  name: PersonName;

  @Prop() occupation?: string;
  @Prop() dateOfBirth?: Date;
  @Prop() age?: number;
  @Prop({ type: String, enum: ['Male', 'Female', 'Others'] })
  gender?: string;

  @Prop() guardianName?: string;
  @Prop() guardianRelation?: string;
  @Prop() guardianOccupation?: string;
  @Prop() guardian2Name?: string;
  @Prop() guardian2Relation?: string;
  @Prop() guardian2Occupation?: string;

  @Prop() instagram?: string;
  @Prop() phoneNumber?: string;
  @Prop() primaryContactPerson?: string;
  @Prop() address?: string;

  // --- Fee profile (editable) ---
  @Prop({ type: String, enum: Object.values(FeeType) })
  preferredFeePackage?: FeeType;

  @Prop({ default: 0 }) monthlyFee?: number;
  @Prop({ default: 0 }) packageFee?: number;
  @Prop({ default: 0 }) noOfMonthsInPackage?: number;
  @Prop({ default: 0 }) attendanceBasedFee?: number;
  @Prop({ default: 0 }) validityIfAttendanceBased?: number;
  @Prop({ default: 0 }) noOfClassesIfAttendanceBased?: number;
  @Prop({ default: 0 }) balance: number;

  // --- System-managed / computed (Rule 5 — never set via ordinary forms) ---
  @Prop({ index: true }) latestDueDate?: Date;
  @Prop({
    type: String,
    enum: Object.values(LatestPaymentStatus),
    index: true,
  })
  latestPaymentStatus?: LatestPaymentStatus;
  @Prop({ type: String, enum: Object.values(OverdueThisMonth) })
  overdueThisMonth?: OverdueThisMonth;
  @Prop({ default: 0 }) expectedAmountThisMonth?: number;

  // 7-day attendance strip markers (P | A | ! | "")
  @Prop({ default: '' }) today?: string;
  @Prop({ default: '' }) yesterday?: string;
  @Prop({ default: '' }) days3ago?: string;
  @Prop({ default: '' }) days4ago?: string;
  @Prop({ default: '' }) days5ago?: string;
  @Prop({ default: '' }) days6ago?: string;
  @Prop({ default: '' }) days7ago?: string;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ branchId: 1, activeStatus: 1 });
StudentSchema.index({ branchId: 1, latestPaymentStatus: 1 });
