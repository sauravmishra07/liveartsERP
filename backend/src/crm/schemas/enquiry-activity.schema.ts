import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EnquiryActivityDocument = HydratedDocument<EnquiryActivity>;

/** Timeline entry for an enquiry (auto-logged on status changes, demos, follow-ups, conversion). */
@Schema({ timestamps: true })
export class EnquiryActivity {
  @Prop({ type: Types.ObjectId, ref: 'Enquiry', required: true, index: true })
  enquiryId: Types.ObjectId;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;
}

export const EnquiryActivitySchema = SchemaFactory.createForClass(EnquiryActivity);
