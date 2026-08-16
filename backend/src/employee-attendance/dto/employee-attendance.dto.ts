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
import { EmployeeAttendanceStatus } from '../../common/enums';

export class MarkEmployeeAttendanceDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: EmployeeAttendanceStatus })
  @IsEnum(EmployeeAttendanceStatus)
  status: EmployeeAttendanceStatus;
}

export class EmpAttRecordDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ enum: EmployeeAttendanceStatus })
  @IsEnum(EmployeeAttendanceStatus)
  status: EmployeeAttendanceStatus;
}

export class MarkEmployeeAttendanceBulkDto {
  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [EmpAttRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpAttRecordDto)
  records: EmpAttRecordDto[];
}

export class EmployeeAttendanceQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ example: '2026-08-16' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
