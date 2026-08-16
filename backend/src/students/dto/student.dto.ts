import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PersonNameDto } from '../../common/dto/person-name.dto';
import {
  ActiveStatus,
  FeeType,
  LatestPaymentStatus,
  OverdueThisMonth,
  StudentStatus,
} from '../../common/enums';

export class CreateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  formNo?: number;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  activeStatus?: ActiveStatus;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  studentStatus?: StudentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  enterDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentStatusRemarks?: string;

  @ApiPropertyOptional({ description: 'Own branch enforced for non-super-admin' })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  batchId?: string;

  @ApiProperty()
  @IsDateString()
  joiningDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualJoiningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ type: PersonNameDto })
  @ValidateNested()
  @Type(() => PersonNameDto)
  name: PersonNameDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Others'] })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Others'])
  gender?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() guardianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianRelation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianOccupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardian2Name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardian2Relation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardian2Occupation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryContactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  // --- Fee profile (editable) ---
  @ApiPropertyOptional({ enum: FeeType })
  @IsOptional()
  @IsEnum(FeeType)
  preferredFeePackage?: FeeType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) monthlyFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) packageFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) noOfMonthsInPackage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) attendanceBasedFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) validityIfAttendanceBased?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) noOfClassesIfAttendanceBased?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() balance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legacyId?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class StudentQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() branchId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  activeStatus?: ActiveStatus;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  studentStatus?: StudentStatus;

  @ApiPropertyOptional() @IsOptional() @IsMongoId() batchId?: string;

  @ApiPropertyOptional({ enum: LatestPaymentStatus })
  @IsOptional()
  @IsEnum(LatestPaymentStatus)
  latestPaymentStatus?: LatestPaymentStatus;

  @ApiPropertyOptional({ enum: OverdueThisMonth })
  @IsOptional()
  @IsEnum(OverdueThisMonth)
  overdueThisMonth?: OverdueThisMonth;
}

export class UpdateStudentStatusDto {
  @ApiProperty({ enum: StudentStatus })
  @IsEnum(StudentStatus)
  studentStatus: StudentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class ChangeBatchDto {
  @ApiProperty()
  @IsMongoId()
  batchId: string;
}

export class SetBreakDto {
  @ApiProperty({ description: 'true = put On Break, false = clear back to Regular' })
  @IsIn([true, false])
  onBreak: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
