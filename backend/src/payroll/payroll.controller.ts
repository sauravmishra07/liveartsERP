import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { PayrollQueryDto, PostPayrollDto } from './dto/payroll.dto';
import { PayrollService } from './payroll.service';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  @Roles(...ADMIN_ROLES)
  compute(@CurrentUser() user: AuthUser, @Query() query: PayrollQueryDto) {
    return this.payroll.computeAll(user, query.month, query.branchId);
  }

  @Post('post')
  @Roles(...ADMIN_ROLES)
  post(@CurrentUser() user: AuthUser, @Body() dto: PostPayrollDto) {
    return this.payroll.postSalaries(user, dto.month, dto.branchId);
  }
}
