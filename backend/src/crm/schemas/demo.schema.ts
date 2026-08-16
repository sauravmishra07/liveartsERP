import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DemoStatus } from '../../common/enums';

export type DemoDocument = HydratedDocument<Demo>;

@Schema({ timestamps: true })
export class Demo {
  @Prop({ type: Types.ObjectId, ref: 'Enquiry', required: true, index: true })
  enquiryId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String })
  time?: string;

  @Prop({ type: String, enum: Object.values(DemoStatus), default: DemoStatus.SCHEDULED })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Batch' })
  batchId?: Types.ObjectId;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;
}

export const DemoSchema = SchemaFactory.createForClass(Demo);
