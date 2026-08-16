import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ActiveStatus,
  FeeRecordPaymentStatus,
  FeeType,
  LatestPaymentStatus,
  OVERDUE_STATUSES,
  OverdueThisMonth,
  SaveDetail,
  StudentAttendanceStatus,
} from '../common/enums';
import { resolveBranchFilter } from '../common/utils/branch-scope.util';
import {
  addDays,
  daysBetweenIST,
  endOfMonthIST,
  startOfDayIST,
  startOfMonthIST,
} from '../common/utils/date.util';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { StudentAttendance, StudentAttendanceDocument } from '../attendance/schemas/student-attendance.schema';
import { FeeRecord, FeeRecordDocument } from './schemas/fee-record.schema';

const n = (v: any): number => Number(v || 0);
const OVERDUE_TIERS: [number, LatestPaymentStatus][] = [
  [90, LatestPaymentStatus.OVERDUE_90],
  [60, LatestPaymentStatus.OVERDUE_60],
  [30, LatestPaymentStatus.OVERDUE_30],
  [15, LatestPaymentStatus.OVERDUE_15],
  [10, LatestPaymentStatus.OVERDUE_10],
  [5, LatestPaymentStatus.OVERDUE_5],
];
const CYCLE_TYPES: string[] = [FeeType.MONTHLY, FeeType.PACKAGE, FeeType.ATTENDANCE_BASED];

/**
 * The derived-fee-state engine (Requirements §6.1 & §6.2), a faithful port of the
 * Zoho daily jobs (manualfeeupdate* / manualoverdue*), parameterized by branch.
 * System-managed student fields: latestDueDate, latestPaymentStatus,
 * overdueThisMonth, expectedAmountThisMonth (+ synced fee profile & balance).
 */
@Injectable()
export class FeeEngineService {
  constructor(
    @InjectModel(FeeRecord.name) private readonly feeModel: Model<FeeRecordDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(StudentAttendance.name) private readonly attModel: Model<StudentAttendanceDocument>,
  ) {}

  /** Rank fee records by `ne` (desc), tie-broken by paymentDate (later wins). */
  private latestBy(fees: any[], filter: (r: any) => boolean): any {
    let best: any = null;
    let bestNe: number | null = null;
    let bestPay: number | null = null;
    for (const r of fees) {
      if (!filter(r) || !r.ne) continue;
      const ne = new Date(r.ne).getTime();
      const pay = r.paymentDate ? new Date(r.paymentDate).getTime() : null;
      if (bestNe === null || ne > bestNe) {
        bestNe = ne;
        best = r;
        bestPay = pay;
      } else if (ne === bestNe) {
        if (best && pay !== null && bestPay !== null) {
          if (pay > bestPay) { best = r; bestPay = pay; }
        } else if (bestPay === null && pay !== null) {
          best = r;
          bestPay = pay;
        }
      }
    }
    return best;
  }

  /** §6.1: latestDueDate, latestPaymentStatus (+ overdue tiers), profile sync. */
  private async applyStatus(student: StudentDocument, fees: any[]): Promise<void> {
    const joining = student.joiningDate ? startOfDayIST(new Date(student.joiningDate)) : null;
    let latestDueDate: Date | null = null;
    let status = '';

    const rec = this.latestBy(fees, (r) => r.feeType !== FeeType.OTHER);
    if (rec) {
      const ne = startOfDayIST(new Date(rec.ne));
      if (joining && ne.getTime() < joining.getTime() && n(student.balance) === 0) {
        latestDueDate = joining;
        status = LatestPaymentStatus.UNPAID;
      } else {
        if (rec.feeType === FeeType.ATTENDANCE_BASED) {
          const from = rec.oldDueDate ? startOfDayIST(new Date(rec.oldDueDate)) : ne;
          const atts = await this.attModel
            .find({
              studentId: student._id,
              status: StudentAttendanceStatus.PRESENT,
              date: { $gte: from, $lte: ne },
            })
            .select('date')
            .lean()
            .exec();
          let lastAtt: number | null = null;
          for (const a of atts) {
            const d = new Date(a.date).getTime();
            if (lastAtt === null || d > lastAtt) lastAtt = d;
          }
          latestDueDate = atts.length >= n(rec.noOfClasses) && lastAtt !== null ? addDays(new Date(lastAtt), 1) : ne;
        } else {
          latestDueDate = ne;
        }
        if (rec.paymentStatus === FeeRecordPaymentStatus.PAID_OR_CLEARED) status = LatestPaymentStatus.PAID;
        else if (rec.paymentStatus === FeeRecordPaymentStatus.BALANCE) status = LatestPaymentStatus.BALANCE;
      }
    } else if (fees.length === 0) {
      latestDueDate = joining;
      status = LatestPaymentStatus.UNPAID;
    }

    let overdueDays = 0;
    if (latestDueDate) {
      const d = daysBetweenIST(latestDueDate, startOfDayIST(new Date()));
      if (d > 0) overdueDays = d;
    }
    if (status !== LatestPaymentStatus.UNPAID) {
      for (const [threshold, tier] of OVERDUE_TIERS) {
        if (overdueDays >= threshold) { status = tier; break; }
      }
      if (status !== LatestPaymentStatus.UNPAID && overdueDays > 0 && !status.startsWith('Overdue')) {
        status = LatestPaymentStatus.OVERDUE;
      }
    }

    // Profile sync (Save_Detail)
    if (rec) {
      student.balance = n(rec.balance);
      if (rec.saveDetail === SaveDetail.YES) {
        student.preferredFeePackage = rec.feeType;
        if (rec.feeType === FeeType.MONTHLY && String(rec.noOfDaysMonths).includes('30')) {
          student.monthlyFee = n(rec.amount);
        } else if (rec.feeType === FeeType.PACKAGE && rec.amount != null) {
          student.packageFee = n(rec.amount);
          student.noOfMonthsInPackage = n(rec.noOfDaysMonths);
        } else if (rec.feeType === FeeType.ATTENDANCE_BASED) {
          student.attendanceBasedFee = n(rec.amount);
          student.validityIfAttendanceBased = n(rec.noOfDaysMonths);
          student.noOfClassesIfAttendanceBased = n(rec.noOfClasses);
        }
      } else if (rec.saveDetail === SaveDetail.ONLY_FEE_TYPE) {
        student.preferredFeePackage = rec.feeType;
      }
    }

    student.latestDueDate = latestDueDate ?? undefined;
    student.latestPaymentStatus = status ? (status as LatestPaymentStatus) : undefined;
  }

  /** §6.2: overdueThisMonth + expectedAmountThisMonth. */
  private applyOverdue(student: StudentDocument, fees: any[]): void {
    const start = startOfMonthIST(new Date());
    const end = endOfMonthIST(new Date());
    const latest = this.latestBy(fees, () => true);

    if (fees.length === 0) {
      student.overdueThisMonth = OverdueThisMonth.YES;
      student.balance = 0;
    } else if (latest && CYCLE_TYPES.includes(latest.feeType)) {
      const newDue = startOfDayIST(new Date(latest.ne));
      const oldDue = latest.oldDueDate ? startOfDayIST(new Date(latest.oldDueDate)) : newDue;
      if (latest.feeType === FeeType.ATTENDANCE_BASED && OVERDUE_STATUSES.includes(student.latestPaymentStatus as any)) {
        student.overdueThisMonth = OverdueThisMonth.YES;
      } else if (newDue.getTime() > end.getTime()) {
        student.overdueThisMonth =
          oldDue.getTime() >= start.getTime() && oldDue.getTime() <= end.getTime()
            ? OverdueThisMonth.CLEARED
            : OverdueThisMonth.NO;
      } else {
        student.overdueThisMonth = OverdueThisMonth.YES;
      }
    } else {
      student.overdueThisMonth = OverdueThisMonth.YES;
      student.balance = 0;
    }

    const preferred = student.preferredFeePackage;
    const latestStatus = student.latestPaymentStatus || '';
    const monthlyFee = n(student.monthlyFee);
    const packageFee = n(student.packageFee);
    const bal = n(student.balance);

    if (student.overdueThisMonth === OverdueThisMonth.CLEARED) {
      student.expectedAmountThisMonth = bal;
    } else if (student.overdueThisMonth === OverdueThisMonth.YES) {
      if (preferred === FeeType.MONTHLY) {
        if (latestStatus.includes('Overdue (60+ Days)')) student.expectedAmountThisMonth = 3 * monthlyFee + bal;
        else if (latestStatus.includes('Overdue (30+ Days)')) student.expectedAmountThisMonth = 2 * monthlyFee + bal;
        else student.expectedAmountThisMonth = monthlyFee + bal;
      } else if (preferred === FeeType.PACKAGE) {
        student.expectedAmountThisMonth = packageFee + bal;
      } else {
        student.expectedAmountThisMonth = monthlyFee + bal;
      }
    } else {
      student.expectedAmountThisMonth = bal;
    }
  }

  async recomputeForStudent(studentId: string | Types.ObjectId): Promise<StudentDocument | null> {
    const student = await this.studentModel.findById(studentId).exec();
    if (!student) return null;
    const fees = await this.feeModel.find({ studentId: student._id }).lean().exec();
    await this.applyStatus(student, fees);
    this.applyOverdue(student, fees);
    await student.save();
    return student;
  }

  /** Manual/admin batch recompute over active students (branch-parameterized — covers all branches). */
  async recomputeAll(user: AuthUser, branchId?: string): Promise<{ updated: number }> {
    const branchFilter = resolveBranchFilter(user, branchId);
    const students = await this.studentModel
      .find({ ...branchFilter, activeStatus: ActiveStatus.ACTIVE })
      .select('_id')
      .lean()
      .exec();
    let updated = 0;
    for (const s of students) {
      await this.recomputeForStudent(String(s._id));
      updated++;
    }
    return { updated };
  }
}
