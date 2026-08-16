import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Activity, BatchStatus, WeekDay } from '../../common/enums';

export type BatchDocument = HydratedDocument<Batch>;

@Schema({ timestamps: true })
export class Batch {
  @Prop({ required: true, trim: true })
  batchName: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(Activity), required: true })
  activity: Activity;

  @Prop({
    type: String,
    enum: Object.values(BatchStatus),
    default: BatchStatus.ACTIVE,
    index: true,
  })
  status: BatchStatus;

  @Prop({ trim: true })
  timings?: string;

  // Class days — drives the attendance strip's "scheduled but unmarked" (!) logic.
  @Prop({ type: [{ type: String, enum: Object.values(WeekDay) }], default: [] })
  days: WeekDay[];

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  teacherId?: Types.ObjectId;

  @Prop({ trim: true })
  teacherPhone?: string;

  @Prop({ default: 0 })
  monthlyFee?: number;

  @Prop({ default: 0 })
  packageFee?: number;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);
// A batch name is unique within a branch.
BatchSchema.index({ branchId: 1, batchName: 1 }, { unique: true });
