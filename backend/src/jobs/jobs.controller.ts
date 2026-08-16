import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JobsScheduler } from './jobs.scheduler';
import { JobsService } from './jobs.service';

class RunJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  branchId?: string;
}

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly scheduler: JobsScheduler,
  ) {}

  @Get('status')
  status() {
    return this.scheduler.status();
  }

  @Post('run/daily-recompute')
  @Roles(...ADMIN_ROLES)
  runDaily(@CurrentUser() user: AuthUser, @Body() dto: RunJobDto) {
    return this.jobs.runDaily(user, dto.branchId);
  }

  @Post('run/monthly')
  @Roles(...ADMIN_ROLES)
  runMonthly(@CurrentUser() user: AuthUser, @Body() dto: RunJobDto) {
    return this.jobs.runMonthly(user, dto.branchId);
  }
}
