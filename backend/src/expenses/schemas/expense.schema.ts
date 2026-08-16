import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseReferenceType, ExpenseStatus, ExpenseType } from '../../common/enums';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, enum: Object.values(ExpenseType), default: ExpenseType.ONE_TIME, index: true })
  expenseType: string;

  @Prop({ type: String, enum: Object.values(ExpenseStatus), default: ExpenseStatus.UNPAID, index: true })
  expenseStatus: string;

  @Prop({ type: Date, index: true })
  fromDate?: Date;

  @Prop({ type: Date })
  toDate?: Date;

  @Prop({ type: Number, default: 0 })
  expectedExpense: number;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: [Types.ObjectId], ref: 'Batch', default: [] })
  assignedBatches: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Employee', index: true })
  linkedEmployeeId?: Types.ObjectId;

  // Recurring config (Requirements §6.8)
  @Prop({ type: Boolean, default: false })
  autoAdd: boolean;

  @Prop({ type: Number, default: 0 })
  reoccurringFrequency: number; // months

  @Prop({ type: String, enum: Object.values(ExpenseReferenceType) })
  deriveExpectedExpenseFrom?: string;

  @Prop({ type: Number, default: 0 })
  realtimeSalaryCalculation: number;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
