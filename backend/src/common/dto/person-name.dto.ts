import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PersonNameDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty()
  @IsString()
  first: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  suffix?: string;
}
