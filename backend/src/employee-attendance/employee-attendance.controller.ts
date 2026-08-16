import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { EmployeeAttendanceService } from './employee-attendance.service';
import {
  EmployeeAttendanceQueryDto,
  MarkEmployeeAttendanceBulkDto,
  MarkEmployeeAttendanceDto,
} from './dto/employee-attendance.dto';

const MARK_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('employee-attendance')
@ApiBearerAuth()
@Controller('employee-attendance')
export class EmployeeAttendanceController {
  constructor(private readonly service: EmployeeAttendanceService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: EmployeeAttendanceQueryDto) {
    return this.service.list(user, query);
  }

  @Get('roster')
  roster(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.roster(user, date, branchId);
  }

  @Post('mark')
  @Roles(...MARK_ROLES)
  mark(@CurrentUser() user: AuthUser, @Body() dto: MarkEmployeeAttendanceDto) {
    return this.service.mark(user, dto);
  }

  @Post('mark-bulk')
  @Roles(...MARK_ROLES)
  markBulk(@CurrentUser() user: AuthUser, @Body() dto: MarkEmployeeAttendanceBulkDto) {
    return this.service.markBulk(user, dto);
  }
}
