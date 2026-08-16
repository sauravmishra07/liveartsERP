import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EnquiryStatus } from '../../common/enums';
import { PersonName, PersonNameSchema } from '../../common/schemas/person-name.schema';

export type EnquiryDocument = HydratedDocument<Enquiry>;

@Schema({ timestamps: true })
export class Enquiry {
  @Prop({ type: PersonNameSchema, required: true })
  name: PersonName;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String })
  source?: string;

  @Prop({ type: String })
  interestedActivity?: string;

  @Prop({ type: String, enum: Object.values(EnquiryStatus), default: EnquiryStatus.NEW, index: true })
  status: string;

  @Prop({ type: String })
  assignedStaff?: string;

  @Prop({ type: Date })
  nextFollowUpDate?: Date;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student' })
  convertedStudentId?: Types.ObjectId;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);
