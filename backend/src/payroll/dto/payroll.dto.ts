import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class PayrollQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Any date in the target month (defaults to current month).' })
  @IsOptional()
  @IsDateString()
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}

export class PostPayrollDto extends PayrollQueryDto {}
