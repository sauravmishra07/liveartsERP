import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AttendanceService } from './attendance.service';
import {
  AttendanceQueryDto,
  MarkAttendanceDto,
  MarkBatchAttendanceDto,
  RecomputeStripDto,
} from './dto/attendance.dto';

const MARK_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.STAFF, UserRole.TEACHER];
const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: AttendanceQueryDto) {
    return this.attendance.list(user, query);
  }

  @Get('batch-summary')
  batchSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.attendance.batchSummary(user, from, to, branchId);
  }

  @Get('batch/:batchId')
  roster(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
    @Query('date') date?: string,
  ) {
    return this.attendance.batchRoster(user, batchId, date);
  }

  @Get('student/:studentId')
  studentHistory(@CurrentUser() user: AuthUser, @Param('studentId') studentId: string) {
    return this.attendance.studentHistory(user, studentId);
  }

  @Post('mark')
  @Roles(...MARK_ROLES)
  mark(@CurrentUser() user: AuthUser, @Body() dto: MarkAttendanceDto) {
    return this.attendance.mark(user, dto);
  }

  @Post('batch/:batchId/mark')
  @Roles(...MARK_ROLES)
  markBatch(
    @CurrentUser() user: AuthUser,
    @Param('batchId') batchId: string,
    @Body() dto: MarkBatchAttendanceDto,
  ) {
    return this.attendance.markBatch(user, batchId, dto);
  }

  @Post('recompute-strip')
  @Roles(...ADMIN_ROLES)
  recomputeStrip(@CurrentUser() user: AuthUser, @Body() dto: RecomputeStripDto) {
    return this.attendance.recomputeStrip(user, dto.branchId);
  }
}
