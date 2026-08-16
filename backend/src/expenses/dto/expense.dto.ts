import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ExpenseReferenceType, ExpenseStatus, ExpenseType } from '../../common/enums';

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  expenseStatus?: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedExpense?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  assignedBatches?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  linkedEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoAdd?: boolean;

  @ApiPropertyOptional({ description: 'Months between recurrences' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reoccurringFrequency?: number;

  @ApiPropertyOptional({ enum: ExpenseReferenceType })
  @IsOptional()
  @IsEnum(ExpenseReferenceType)
  deriveExpectedExpenseFrom?: ExpenseReferenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ExpenseQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  expenseStatus?: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  linkedEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class GenerateRecurringDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}
