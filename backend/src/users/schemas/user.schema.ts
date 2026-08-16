import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '../../common/enums';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // Never returned by default — auth service selects it explicitly.
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: Object.values(UserRole), required: true })
  role: UserRole;

  // null for cross-branch roles (SUPER_ADMIN).
  @Prop({ type: Types.ObjectId, ref: 'Branch', default: null, index: true })
  branchId: Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
