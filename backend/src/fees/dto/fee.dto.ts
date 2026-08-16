import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  FeeType,
  PaymentMode,
  SaveDetail,
} from '../../common/enums';

/** Input for both a live quote (preview) and recording a payment. */
export class CollectFeeDto {
  @ApiProperty()
  @IsMongoId()
  studentId: string;

  @ApiPropertyOptional({ example: '2026-08-16' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  feeType: FeeType;

  @ApiPropertyOptional({ description: 'Monthly: days · Package: months · Attendance: validity days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  noOfDaysMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  noOfClasses?: number;

  @ApiPropertyOptional({ enum: PaymentMode, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMode, { each: true })
  modeOfPayment?: PaymentMode[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  onlineAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  previousBalanceIfAny?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  waivedOffAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  extendedDays?: number;

  @ApiPropertyOptional({ description: 'Defaults to the student’s latest due date / joining date.' })
  @IsOptional()
  @IsDateString()
  oldDueDate?: string;

  @ApiPropertyOptional({ enum: SaveDetail })
  @IsOptional()
  @IsEnum(SaveDetail)
  saveDetail?: SaveDetail;

  @ApiPropertyOptional({ description: 'Only used for feeType = Other (manual amount).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feeRemarks?: string;
}

export class FeeQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ enum: FeeType })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class RecomputeFeesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}
