import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Activity, BatchStatus, WeekDay } from '../../common/enums';

export class CreateBatchDto {
  @ApiProperty()
  @IsString()
  batchName: string;

  @ApiPropertyOptional({ description: 'Own branch enforced for non-super-admin' })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiProperty({ enum: Activity })
  @IsEnum(Activity)
  activity: Activity;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({ example: '5:00 PM - 6:00 PM' })
  @IsOptional()
  @IsString()
  timings?: string;

  @ApiPropertyOptional({ enum: WeekDay, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WeekDay, { each: true })
  days?: WeekDay[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  packageFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legacyId?: string;
}

export class UpdateBatchDto extends PartialType(CreateBatchDto) {}

export class BatchQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ enum: Activity })
  @IsOptional()
  @IsEnum(Activity)
  activity?: Activity;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  teacherId?: string;
}
