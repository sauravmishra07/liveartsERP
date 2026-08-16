import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ExpenseReferenceType, ExpenseStatus, ExpenseType } from '../common/enums';
import { assertBranchAccess, branchForWrite, resolveBranchFilter } from '../common/utils/branch-scope.util';
import { endOfMonthIST, istParts, startOfMonthIST } from '../common/utils/date.util';
import { paginate } from '../common/utils/query.util';
import { CreateExpenseDto, ExpenseQueryDto, UpdateExpenseDto } from './dto/expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

const n = (v: any): number => Number(v || 0);

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private readonly model: Model<ExpenseDocument>,
  ) {}

  private toDoc(dto: CreateExpenseDto | UpdateExpenseDto): Record<string, any> {
    const d: Record<string, any> = { ...dto };
    if (dto.assignedBatches) d.assignedBatches = dto.assignedBatches.map((b) => new Types.ObjectId(b));
    if (dto.linkedEmployeeId) d.linkedEmployeeId = new Types.ObjectId(dto.linkedEmployeeId);
    if (dto.fromDate) d.fromDate = new Date(dto.fromDate);
    if (dto.toDate) d.toDate = new Date(dto.toDate);
    delete d.branchId;
    return d;
  }

  create(user: AuthUser, dto: CreateExpenseDto) {
    const branchId = branchForWrite(user, dto.branchId);
    return this.model.create({ ...this.toDoc(dto), branchId });
  }

  async update(user: AuthUser, id: string, dto: UpdateExpenseDto) {
    const exp = await this.model.findById(id).exec();
    if (!exp) throw new NotFoundException('Expense not found');
    assertBranchAccess(user, String(exp.branchId));
    Object.assign(exp, this.toDoc(dto));
    await exp.save();
    return exp;
  }

  async findOne(user: AuthUser, id: string) {
    const exp = await this.model.findById(id).populate('linkedEmployeeId', 'name').populate('assignedBatches', 'batchName').lean().exec();
    if (!exp) throw new NotFoundException('Expense not found');
    assertBranchAccess(user, String(exp.branchId));
    return exp;
  }

  async remove(user: AuthUser, id: string) {
    const exp = await this.model.findById(id).exec();
    if (!exp) throw new NotFoundException('Expense not found');
    assertBranchAccess(user, String(exp.branchId));
    await exp.deleteOne();
    return { deleted: true };
  }

  list(user: AuthUser, q: ExpenseQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.expenseType) filter.expenseType = q.expenseType;
    if (q.expenseStatus) filter.expenseStatus = q.expenseStatus;
    if (q.linkedEmployeeId) filter.linkedEmployeeId = new Types.ObjectId(q.linkedEmployeeId);
    if (q.dateFrom || q.dateTo) {
      filter.fromDate = {};
      if (q.dateFrom) filter.fromDate.$gte = new Date(q.dateFrom);
      if (q.dateTo) filter.fromDate.$lte = new Date(q.dateTo);
    }
    if (q.search) filter.title = { $regex: q.search, $options: 'i' };
    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'fromDate',
      sortOrder: q.sortOrder,
      populate: [{ path: 'linkedEmployeeId', select: 'name' }],
    });
  }

  private latestByFromDate(list: any[]): any {
    let best: any = null;
    let bestT: number | null = null;
    for (const e of list) {
      if (!e.fromDate) continue;
      const t = new Date(e.fromDate).getTime();
      if (bestT === null || t > bestT) { bestT = t; best = e; }
    }
    return best;
  }

  /** Auto-generate recurring expenses due this month (Requirements §6.8). Idempotent. */
  async generateRecurring(user: AuthUser, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const start = startOfMonthIST(new Date());
    const end = endOfMonthIST(new Date());
    const cur = istParts(new Date());
    const curMonths = cur.year * 12 + (cur.month + 1);

    const recurring = await this.model
      .find({ ...branchFilter, autoAdd: true, expenseType: ExpenseType.REOCCURRING })
      .lean()
      .exec();

    let created = 0;
    for (const exp of recurring) {
      const freq = n(exp.reoccurringFrequency);
      if (freq <= 0) continue;

      const all = await this.model.find({ title: exp.title, branchId: exp.branchId }).lean().exec();
      let ref: any = null;
      if (exp.deriveExpectedExpenseFrom === ExpenseReferenceType.LAST_YEAR) {
        const lastYear = cur.year - 1;
        ref =
          all.find(
            (e) =>
              e.fromDate &&
              istParts(new Date(e.fromDate)).year === lastYear &&
              istParts(new Date(e.fromDate)).month === cur.month,
          ) || this.latestByFromDate(all);
      } else {
        ref = this.latestByFromDate(all);
      }
      if (!ref || !ref.fromDate) continue;

      const lp = istParts(new Date(ref.fromDate));
      const lastMonths = lp.year * 12 + (lp.month + 1);
      const monthsDiff = curMonths - lastMonths;
      if (monthsDiff >= freq && monthsDiff % freq === 0) {
        const exists = await this.model.exists({ title: exp.title, branchId: exp.branchId, fromDate: start });
        if (exists) continue;
        await this.model.create({
          title: exp.title,
          branchId: exp.branchId,
          fromDate: start,
          toDate: end,
          expenseType: ExpenseType.REOCCURRING,
          reoccurringFrequency: freq,
          deriveExpectedExpenseFrom: exp.deriveExpectedExpenseFrom,
          expectedExpense: n(ref.amount),
          expenseStatus: ExpenseStatus.UNPAID,
          autoAdd: true,
        });
        created++;
      }
    }
    return { created };
  }
}
