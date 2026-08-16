import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.dashboard.overview(user, branchId);
  }

  @Get('analytics')
  analytics(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('months') months?: string,
  ) {
    const m = Math.min(Math.max(parseInt(months || '6', 10) || 6, 3), 12);
    return this.dashboard.analytics(user, branchId, m);
  }

  @Get('status-distribution')
  statusDistribution(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.dashboard.statusDistribution(user, branchId);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.dashboard.recent(user, branchId);
  }

  @Get('batch-summary')
  batchSummary(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.dashboard.batchWiseSummary(user, branchId);
  }
}
