import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PersonNameDto } from '../../common/dto/person-name.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmployeeStatus, SalaryType } from '../../common/enums';

export class CreateEmployeeDto {
  @ApiProperty({ type: PersonNameDto })
  @ValidateNested()
  @Type(() => PersonNameDto)
  name: PersonNameDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  activeStatus?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Required for non-super-admin (own branch enforced)' })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  batchIds?: string[];

  @ApiProperty({ enum: SalaryType })
  @IsEnum(SalaryType)
  salaryType: SalaryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  classWiseSalary?: number;

  @ApiPropertyOptional({ description: 'Percent (0-100) for Percentage salary type' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeLeaves?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionPerLeave?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionPerUninformedLeave?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  extraIncentive?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legacyId?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class EmployeeQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  activeStatus?: EmployeeStatus;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;
}
