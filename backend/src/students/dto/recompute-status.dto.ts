import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class RecomputeStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}
