import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StudentAttendanceStatus } from '../../common/enums';

export class MarkAttendanceDto {
  @ApiProperty()
  @IsMongoId()
  studentId: string;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: StudentAttendanceStatus })
  @IsEnum(StudentAttendanceStatus)
  status: StudentAttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  batchId?: string;
}

export class AttendanceRecordDto {
  @ApiProperty()
  @IsMongoId()
  studentId: string;

  @ApiProperty({ enum: StudentAttendanceStatus })
  @IsEnum(StudentAttendanceStatus)
  status: StudentAttendanceStatus;
}

export class MarkBatchAttendanceDto {
  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}

export class AttendanceQueryDto extends PaginationDto {
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

  @ApiPropertyOptional({ enum: StudentAttendanceStatus })
  @IsOptional()
  @IsEnum(StudentAttendanceStatus)
  status?: StudentAttendanceStatus;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class RecomputeStripDto {
  @ApiPropertyOptional({ description: 'SUPER_ADMIN may target a branch; others are forced to their own.' })
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}
