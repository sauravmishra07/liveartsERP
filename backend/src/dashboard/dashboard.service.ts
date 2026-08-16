import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ActiveStatus,
  BatchStatus,
  LatestPaymentStatus,
  OVERDUE_STATUSES,
  OverdueThisMonth,
  StudentStatus,
} from '../common/enums';
import { resolveBranchFilter } from '../common/utils/branch-scope.util';
import {
  addDays,
  addMonthsIST,
  endOfMonthIST,
  istParts,
  startOfDayIST,
  startOfMonthIST,
} from '../common/utils/date.util';
import {
  StudentAttendance,
  StudentAttendanceDocument,
} from '../attendance/schemas/student-attendance.schema';
import { Batch, BatchDocument } from '../batches/schemas/batch.schema';
import { Enquiry, EnquiryDocument } from '../crm/schemas/enquiry.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { FeeRecord, FeeRecordDocument } from '../fees/schemas/fee-record.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';

const n = (v: any): number => Number(v || 0);

const IST = 'Asia/Kolkata';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Buckets the granular overdue tiers down to the four states the donut shows. */
function paymentBucket(status?: string): string {
  if (!status) return 'Unpaid';
  if (status === LatestPaymentStatus.PAID) return 'Paid';
  if (status === LatestPaymentStatus.BALANCE) return 'Balance';
  if (status === LatestPaymentStatus.UNPAID) return 'Unpaid';
  return 'Overdue';
}

/** Dashboard + batch-wise financial aggregates (Requirements §20, §6.9). All live, branch-scoped. */
@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(FeeRecord.name) private readonly feeModel: Model<FeeRecordDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Batch.name) private readonly batchModel: Model<BatchDocument>,
    @InjectModel(Enquiry.name) private readonly enquiryModel: Model<EnquiryDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(StudentAttendance.name)
    private readonly attModel: Model<StudentAttendanceDocument>,
  ) {}

  private async sum(model: Model<any>, match: Record<string, any>, field: string): Promise<number> {
    const r = await model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }]);
    return r[0]?.total ?? 0;
  }

  async overview(user: AuthUser, branchId?: string) {
    const bf = resolveBranchFilter(user, branchId);
    const start = startOfMonthIST(new Date());
    const end = endOfMonthIST(new Date());
    const todayStart = startOfDayIST(new Date());

    const [
      activeStudents,
      totalStudents,
      batches,
      employees,
      revenueThisMonth,
      collectionsToday,
      expensesThisMonth,
      pendingExpected,
      overdueCount,
      duesCount,
    ] = await Promise.all([
      this.studentModel.countDocuments({ ...bf, activeStatus: ActiveStatus.ACTIVE }),
      this.studentModel.countDocuments({ ...bf }),
      this.batchModel.countDocuments({ ...bf, status: BatchStatus.ACTIVE }),
      this.empModel.countDocuments({ ...bf }),
      this.sum(this.feeModel, { ...bf, paymentDate: { $gte: start, $lte: end } }, 'amountPaid'),
      this.sum(this.feeModel, { ...bf, paymentDate: { $gte: todayStart } }, 'amountPaid'),
      this.sum(this.expenseModel, { ...bf, fromDate: { $gte: start, $lte: end } }, 'amount'),
      this.sum(this.studentModel, { ...bf, activeStatus: ActiveStatus.ACTIVE, overdueThisMonth: OverdueThisMonth.YES }, 'expectedAmountThisMonth'),
      // Strictly the overdue tiers, so this agrees with the "Overdue" slice of the
      // payment mix. Everyone who simply owes money is `duesCount` below.
      this.studentModel.countDocuments({
        ...bf,
        activeStatus: ActiveStatus.ACTIVE,
        latestPaymentStatus: { $in: OVERDUE_STATUSES },
      }),
      this.studentModel.countDocuments({
        ...bf,
        activeStatus: ActiveStatus.ACTIVE,
        latestPaymentStatus: { $in: [...OVERDUE_STATUSES, LatestPaymentStatus.BALANCE, LatestPaymentStatus.UNPAID] },
      }),
    ]);

    return {
      activeStudents,
      totalStudents,
      batches,
      employees,
      revenueThisMonth,
      collectionsToday,
      expensesThisMonth,
      profitThisMonth: revenueThisMonth - expensesThisMonth,
      pendingExpected,
      overdueCount,
      duesCount,
    };
  }

  /**
   * Chart series for the dashboard, in one round trip (Requirements §20).
   * Grouping keys are produced in IST so the buckets line up with the business day/month.
   */
  async analytics(user: AuthUser, branchId?: string, months = 6) {
    const bf = resolveBranchFilter(user, branchId);
    const now = new Date();
    const thisMonthStart = startOfMonthIST(now);
    const windowStart = addMonthsIST(thisMonthStart, -(months - 1));
    const monthEnd = endOfMonthIST(now);

    // Month buckets (oldest → newest) so empty months still render as zero.
    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < months; i++) {
      const p = istParts(addMonthsIST(windowStart, i));
      buckets.push({
        key: `${p.year}-${String(p.month + 1).padStart(2, '0')}`,
        label: `${MONTH_LABELS[p.month]}${p.month === 0 || i === 0 ? ` '${String(p.year).slice(2)}` : ''}`,
      });
    }

    const byMonth = (dateField: string, sumField: string) => [
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}`, timezone: IST } }, total: { $sum: `$${sumField}` } } },
    ];

    const attFrom = startOfDayIST(addDays(now, -13)); // 14-day window incl. today

    const [revRows, expRows, joinRows, students, attRows, funnelRows, modeAgg] = await Promise.all([
      this.feeModel.aggregate([{ $match: { ...bf, paymentDate: { $gte: windowStart, $lte: monthEnd } } }, ...byMonth('paymentDate', 'amountPaid')]),
      this.expenseModel.aggregate([{ $match: { ...bf, fromDate: { $gte: windowStart, $lte: monthEnd } } }, ...byMonth('fromDate', 'amount')]),
      this.studentModel.aggregate([
        { $match: { ...bf, joiningDate: { $gte: windowStart, $lte: monthEnd } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$joiningDate', timezone: IST } }, total: { $sum: 1 } } },
      ]),
      this.studentModel.find({ ...bf, activeStatus: ActiveStatus.ACTIVE }).select('latestPaymentStatus').lean(),
      this.attModel.aggregate([
        { $match: { ...bf, date: { $gte: attFrom } } },
        { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: IST } }, status: '$status' }, total: { $sum: 1 } } },
      ]),
      this.enquiryModel.aggregate([{ $match: { ...bf } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      this.feeModel.aggregate([
        { $match: { ...bf, paymentDate: { $gte: thisMonthStart, $lte: monthEnd } } },
        { $group: { _id: null, cash: { $sum: '$cashAmount' }, online: { $sum: '$onlineAmount' } } },
      ]),
    ]);

    const pick = (rows: any[], key: string) => rows.find((r) => r._id === key)?.total ?? 0;
    const trend = buckets.map((b) => {
      const revenue = Math.round(pick(revRows, b.key));
      const expenses = Math.round(pick(expRows, b.key));
      return { month: b.label, revenue, expenses, profit: revenue - expenses, newStudents: pick(joinRows, b.key) };
    });

    // Payment mix — fixed order so colours stay stable across refreshes.
    const mixCounts = new Map<string, number>([['Paid', 0], ['Balance', 0], ['Unpaid', 0], ['Overdue', 0]]);
    for (const s of students) {
      const k = paymentBucket(s.latestPaymentStatus);
      mixCounts.set(k, (mixCounts.get(k) ?? 0) + 1);
    }
    const paymentMix = [...mixCounts].map(([label, count]) => ({ label, count }));

    // Attendance — one point per day, present/absent counts + rate.
    const attendance: { day: string; label: string; present: number; absent: number; rate: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(attFrom, i);
      const p = istParts(d);
      const key = `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const present = attRows.find((r) => r._id.day === key && r._id.status === 'Present')?.total ?? 0;
      const absent = attRows.find((r) => r._id.day === key && r._id.status === 'Absent')?.total ?? 0;
      const marked = present + absent;
      attendance.push({ day: key, label: `${p.day}`, present, absent, rate: marked ? Math.round((present / marked) * 100) : 0 });
    }

    return {
      trend,
      paymentMix,
      attendance,
      enquiryFunnel: funnelRows.map((r) => ({ label: r._id || 'Unknown', count: r.count })),
      collectionMode: { cash: Math.round(modeAgg[0]?.cash ?? 0), online: Math.round(modeAgg[0]?.online ?? 0) },
    };
  }

  async statusDistribution(user: AuthUser, branchId?: string) {
    const bf = resolveBranchFilter(user, branchId);
    const rows = await this.studentModel.aggregate([
      { $match: { ...bf, activeStatus: ActiveStatus.ACTIVE } },
      { $group: { _id: '$studentStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return rows.map((r) => ({ status: r._id || 'Unknown', count: r.count }));
  }

  async recent(user: AuthUser, branchId?: string) {
    const bf = resolveBranchFilter(user, branchId);
    const [payments, enquiries, overdueStudents] = await Promise.all([
      this.feeModel.find({ ...bf }).sort({ paymentDate: -1 }).limit(8).populate('studentId', 'name').lean(),
      this.enquiryModel.find({ ...bf }).sort({ createdAt: -1 }).limit(8).lean(),
      this.studentModel
        .find({ ...bf, activeStatus: ActiveStatus.ACTIVE, latestPaymentStatus: { $in: OVERDUE_STATUSES } })
        .sort({ latestDueDate: 1 })
        .limit(8)
        .select('name latestPaymentStatus latestDueDate expectedAmountThisMonth batchId')
        .populate('batchId', 'batchName')
        .lean(),
    ]);
    return { payments, enquiries, overdueStudents };
  }

  /** Per-active-batch financial snapshot (Requirements §6.9), computed live. */
  async batchWiseSummary(user: AuthUser, branchId?: string) {
    const bf = resolveBranchFilter(user, branchId);
    const start = startOfMonthIST(new Date());
    const end = endOfMonthIST(new Date());

    const batches = await this.batchModel.find({ ...bf, status: BatchStatus.ACTIVE }).lean();
    const activeBatchCount = batches.length;

    // Pre-load this month's expenses once for allocation.
    const expenses = await this.expenseModel.find({ ...bf, fromDate: { $gte: start, $lte: end } }).lean();

    const rows = [];
    for (const batch of batches) {
      const students = await this.studentModel
        .find({ batchId: batch._id, activeStatus: ActiveStatus.ACTIVE })
        .select('studentStatus overdueThisMonth latestPaymentStatus expectedAmountThisMonth')
        .lean();
      const total = students.length;
      const count = (fn: (s: any) => boolean) => students.filter(fn).length;
      const alreadyPaid = count((s) => s.overdueThisMonth === OverdueThisMonth.NO && s.latestPaymentStatus === LatestPaymentStatus.PAID);
      const cleared = count((s) => s.overdueThisMonth === OverdueThisMonth.CLEARED && s.latestPaymentStatus === LatestPaymentStatus.PAID);
      const willPay = total - (alreadyPaid + cleared);
      const pendingExpected = students
        .filter((s) => !((s.overdueThisMonth === OverdueThisMonth.NO && s.latestPaymentStatus === LatestPaymentStatus.PAID) || (s.overdueThisMonth === OverdueThisMonth.CLEARED && s.latestPaymentStatus === LatestPaymentStatus.PAID)))
        .reduce((sum, s) => sum + n(s.expectedAmountThisMonth), 0);

      // Actual collected: fees this month for this batch's students.
      const studentIds = await this.studentModel.find({ batchId: batch._id }).distinct('_id');
      const collectedAgg = await this.feeModel.aggregate([
        { $match: { studentId: { $in: studentIds }, paymentDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]);
      const actualCollected = collectedAgg[0]?.total ?? 0;

      // Expense allocation (§6.9): no assigned batches → /activeBatchCount; N assigned → /N; 1 → full.
      let totalExpense = 0;
      for (const e of expenses) {
        const assigned = (e.assignedBatches || []).map((b: any) => String(b));
        const amt = n(e.amount);
        if (assigned.length === 0) totalExpense += activeBatchCount > 0 ? amt / activeBatchCount : 0;
        else if (assigned.includes(String(batch._id))) totalExpense += amt / assigned.length;
      }

      const totalExpected = pendingExpected + actualCollected;
      rows.push({
        batchId: batch._id,
        batchName: batch.batchName,
        totalStudents: total,
        demo: count((s) => s.studentStatus === StudentStatus.DEMO),
        absent: count((s) => s.studentStatus === StudentStatus.ABSENT),
        onBreak: count((s) => s.studentStatus === StudentStatus.ON_BREAK),
        alreadyPaid,
        cleared,
        willPay,
        pendingExpected: Math.round(pendingExpected),
        actualCollected: Math.round(actualCollected),
        totalExpected: Math.round(totalExpected),
        totalExpense: Math.round(totalExpense),
        actualProfit: Math.round(actualCollected - totalExpense),
        expectedProfit: Math.round(totalExpected - totalExpense),
      });
    }
    return rows;
  }
}
