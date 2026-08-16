import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WhatsappMessageDocument = HydratedDocument<WhatsappMessage>;

@Schema({ timestamps: true })
export class WhatsappMessage {
  @Prop({ type: String, required: true })
  to: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Student', index: true })
  studentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Enquiry' })
  enquiryId?: Types.ObjectId;

  // queued | sent | failed
  @Prop({ type: String, default: 'queued', index: true })
  status: string;

  @Prop({ type: String })
  provider?: string;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;
}

export const WhatsappMessageSchema = SchemaFactory.createForClass(WhatsappMessage);
