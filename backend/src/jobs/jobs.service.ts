import { Injectable, Logger } from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { AttendanceService } from '../attendance/attendance.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FeeEngineService } from '../fees/fee-engine.service';
import { PayrollService } from '../payroll/payroll.service';
import { StudentStatusService } from '../students/student-status.service';

/** Synthetic super-admin for scheduled (system) runs — covers all branches. */
export const SYSTEM_USER: AuthUser = {
  id: '000000000000000000000000',
  email: 'system',
  role: UserRole.SUPER_ADMIN,
  branchId: null,
};

/**
 * Orchestrates the recompute pipelines (Requirements §7). Reusable by the BullMQ
 * scheduler AND the manual admin endpoints — same code path, so nothing drifts.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger('Jobs');
  lastDaily?: Date;
  lastMonthly?: Date;

  constructor(
    private readonly feeEngine: FeeEngineService,
    private readonly studentStatus: StudentStatusService,
    private readonly attendance: AttendanceService,
    private readonly payroll: PayrollService,
    private readonly expenses: ExpensesService,
  ) {}

  /** Daily ERP recompute in the required order (§7.4): fee status → overdue+expected → student status → attendance strip. */
  async runDaily(user: AuthUser, branchId?: string) {
    this.logger.log('Daily recompute: start');
    const fee = await this.feeEngine.recomputeAll(user, branchId); // §6.1 + §6.2
    const status = await this.studentStatus.recomputeAll(user, branchId); // §6.3
    const strip = await this.attendance.recomputeStrip(user, branchId); // §6.4
    this.lastDaily = new Date();
    this.logger.log('Daily recompute: done');
    return { fee, status, strip, ranAt: this.lastDaily };
  }

  /** Monthly jobs: recurring expenses (§6.8) + salary posting (§6.7). */
  async runMonthly(user: AuthUser, branchId?: string) {
    this.logger.log('Monthly jobs: start');
    const recurring = await this.expenses.generateRecurring(user, branchId);
    const salaries = await this.payroll.postSalaries(user, undefined, branchId);
    this.lastMonthly = new Date();
    this.logger.log('Monthly jobs: done');
    return { recurring, salaries, ranAt: this.lastMonthly };
  }
}
