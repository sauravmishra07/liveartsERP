import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EmployeeStatus, SalaryType } from '../../common/enums';
import {
  PersonName,
  PersonNameSchema,
} from '../../common/schemas/person-name.schema';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: PersonNameSchema, required: true })
  name: PersonName;

  @Prop({ trim: true })
  phone?: string;

  @Prop({
    type: String,
    enum: Object.values(EmployeeStatus),
    default: EmployeeStatus.ACTIVE,
    index: true,
  })
  activeStatus: EmployeeStatus;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  // Batches this employee teaches / is assigned to (drives payroll batch count).
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Batch' }], default: [] })
  batchIds: Types.ObjectId[];

  // --- Payroll profile (Requirements §6.7) ---
  @Prop({ type: String, enum: Object.values(SalaryType), required: true })
  salaryType: SalaryType;

  @Prop({ default: 0 })
  fixedSalary: number;

  @Prop({ default: 0 })
  classWiseSalary: number;

  @Prop({ default: 0 })
  percentage: number;

  @Prop({ default: 0 })
  freeLeaves: number;

  @Prop({ default: 0 })
  deductionPerLeave: number;

  @Prop({ default: 0 })
  deductionPerUninformedLeave: number;

  @Prop({ default: 0 })
  extraIncentive: number;

  @Prop({ type: String, index: true })
  legacyId?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
