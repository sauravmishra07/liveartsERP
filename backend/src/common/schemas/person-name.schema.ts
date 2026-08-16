import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Shared name sub-document (Zoho `name` field: prefix/first/last/suffix). */
@Schema({ _id: false })
export class PersonName {
  @Prop({ trim: true })
  prefix?: string;

  @Prop({ required: true, trim: true })
  first: string;

  @Prop({ trim: true })
  last?: string;

  @Prop({ trim: true })
  suffix?: string;
}

export const PersonNameSchema = SchemaFactory.createForClass(PersonName);
