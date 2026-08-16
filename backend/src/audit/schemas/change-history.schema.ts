import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChangeHistoryDocument = HydratedDocument<ChangeHistory>;

@Schema({ timestamps: true })
export class ChangeHistory {
  @Prop({ type: Types.ObjectId, ref: 'Student', index: true })
  studentId?: Types.ObjectId;

  @Prop({ required: true })
  fieldChanged: string;

  @Prop({ type: String })
  oldValue?: string;

  @Prop({ type: String })
  newValue?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy?: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  changeDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const ChangeHistorySchema = SchemaFactory.createForClass(ChangeHistory);
