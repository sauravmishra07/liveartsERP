import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FollowUpType } from '../../common/enums';

export type FollowUpDocument = HydratedDocument<FollowUp>;

@Schema({ timestamps: true })
export class FollowUp {
  @Prop({ type: Types.ObjectId, ref: 'Enquiry', required: true, index: true })
  enquiryId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(FollowUpType) })
  type?: string;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: Date })
  nextFollowUpDate?: Date;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
