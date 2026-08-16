import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BranchDocument = HydratedDocument<Branch>;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  code?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: true })
  isActive: boolean;

  // Old Zoho branch id (e.g. 287579000000065017) — kept for migration mapping, not used as _id.
  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
