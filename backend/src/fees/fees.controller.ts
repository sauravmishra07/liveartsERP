import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CollectFeeDto, FeeQueryDto, RecomputeFeesDto } from './dto/fee.dto';
import { FeesService } from './fees.service';

const COLLECT_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.STAFF];
const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: FeeQueryDto) {
    return this.fees.list(user, query);
  }

  @Get('pending')
  pending(@CurrentUser() user: AuthUser, @Query() query: FeeQueryDto) {
    return this.fees.pending(user, query);
  }

  @Get('student/:studentId')
  studentFees(@CurrentUser() user: AuthUser, @Param('studentId') studentId: string) {
    return this.fees.studentFees(user, studentId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.fees.findOne(user, id);
  }

  @Post('quote')
  @Roles(...COLLECT_ROLES)
  quote(@CurrentUser() user: AuthUser, @Body() dto: CollectFeeDto) {
    return this.fees.quote(user, dto);
  }

  @Post()
  @Roles(...COLLECT_ROLES)
  collect(@CurrentUser() user: AuthUser, @Body() dto: CollectFeeDto) {
    return this.fees.collect(user, dto);
  }

  @Post('recompute')
  @Roles(...ADMIN_ROLES)
  recompute(@CurrentUser() user: AuthUser, @Body() dto: RecomputeFeesDto) {
    return this.fees.recompute(user, dto.branchId);
  }
}
