import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FeeRecordPaymentStatus, FeeType, SaveDetail } from '../../common/enums';

export type FeeRecordDocument = HydratedDocument<FeeRecord>;

@Schema({ timestamps: true })
export class FeeRecord {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  paymentDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Batch' })
  batchId?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(FeeType), required: true })
  feeType: string;

  // Monthly => days (default 30); Package => months; Attendance => validity days.
  @Prop({ type: Number, default: 0 })
  noOfDaysMonths: number;

  @Prop({ type: Number, default: 0 })
  noOfClasses: number;

  // Cash / Online (either or both).
  @Prop({ type: [String], default: [] })
  modeOfPayment: string[];

  @Prop({ type: Number, default: 0 })
  cashAmount: number;

  @Prop({ type: Number, default: 0 })
  onlineAmount: number;

  @Prop({ type: Number, default: 0 })
  amountPaid: number;

  // The fee due for this period (the "Amount1" from Zoho).
  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: String, enum: Object.values(FeeRecordPaymentStatus) })
  paymentStatus?: string;

  @Prop({ type: Date })
  oldDueDate?: Date;

  // Next due date (Zoho "Ne") — the key field the status engine ranks by.
  @Prop({ type: Date, index: true })
  ne?: Date;

  @Prop({ type: String, enum: Object.values(SaveDetail), default: SaveDetail.YES })
  saveDetail: string;

  @Prop({ type: String })
  feeRemarks?: string;

  // Entry-time helpers (kept for audit/parity).
  @Prop({ type: Number, default: 0 })
  previousBalanceIfAny: number;

  @Prop({ type: Number, default: 0 })
  waivedOffAmount: number;

  @Prop({ type: Number, default: 0 })
  extendedDays: number;

  @Prop({ type: Number, default: 0 })
  expectedAmount: number;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const FeeRecordSchema = SchemaFactory.createForClass(FeeRecord);
FeeRecordSchema.index({ studentId: 1, ne: -1 });
