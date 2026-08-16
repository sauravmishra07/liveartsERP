import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums';
import { AuditService } from './audit.service';

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Exact field name, e.g. studentStatus' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

@ApiTags('audit')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    return this.audit.list(user, query);
  }

  @Get('fields')
  fields(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.audit.fields(user, branchId);
  }
}
