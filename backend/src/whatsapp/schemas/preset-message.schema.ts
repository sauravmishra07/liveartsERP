import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PresetMessageDocument = HydratedDocument<PresetMessage>;

@Schema({ timestamps: true })
export class PresetMessage {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const PresetMessageSchema = SchemaFactory.createForClass(PresetMessage);
