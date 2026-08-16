import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ActiveStatus,
  FeeType,
  LatestPaymentStatus,
  OVERDUE_STATUSES,
  OverdueThisMonth,
  SaveDetail,
} from '../common/enums';
import { assertBranchAccess, resolveBranchFilter } from '../common/utils/branch-scope.util';
import { formatIST } from '../common/utils/date.util';
import { paginate } from '../common/utils/query.util';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CollectFeeDto, FeeQueryDto } from './dto/fee.dto';
import { FeeCalcService } from './fee-calc.service';
import { FeeEngineService } from './fee-engine.service';
import { FeeRecord, FeeRecordDocument } from './schemas/fee-record.schema';

const n = (v: any): number => Number(v || 0);

@Injectable()
export class FeesService {
  constructor(
    @InjectModel(FeeRecord.name) private readonly feeModel: Model<FeeRecordDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    private readonly calc: FeeCalcService,
    private readonly engine: FeeEngineService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  private async ownedStudent(user: AuthUser, studentId: string): Promise<StudentDocument> {
    const s = await this.studentModel.findById(studentId).exec();
    if (!s) throw new NotFoundException('Student not found');
    assertBranchAccess(user, String(s.branchId));
    return s;
  }

  /** Live dues preview (no write) for the Collect-Fee screen (Requirements §16). */
  async quote(user: AuthUser, dto: CollectFeeDto) {
    const student = await this.ownedStudent(user, dto.studentId);
    const q = this.calc.compute(student, dto);
    return {
      ...q,
      currentBalance: n(student.balance),
      studentLatestDueDate: student.latestDueDate ?? null,
      latestPaymentStatus: student.latestPaymentStatus ?? null,
      expectedAmountThisMonth: n(student.expectedAmountThisMonth),
    };
  }

  /** Record a payment, then recompute the student's derived fee state (Requirements §11). */
  async collect(user: AuthUser, dto: CollectFeeDto) {
    const student = await this.ownedStudent(user, dto.studentId);
    const q = this.calc.compute(student, dto);

    const rec = await this.feeModel.create({
      studentId: student._id,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      branchId: student.branchId,
      batchId: student.batchId,
      feeType: dto.feeType,
      noOfDaysMonths: n(dto.noOfDaysMonths),
      noOfClasses: n(dto.noOfClasses),
      modeOfPayment: dto.modeOfPayment || [],
      cashAmount: n(dto.cashAmount),
      onlineAmount: n(dto.onlineAmount),
      amountPaid: q.amountPaid,
      amount: q.amount,
      balance: q.balance,
      paymentStatus: q.paymentStatus ?? undefined,
      oldDueDate: q.oldDueDate ?? undefined,
      ne: q.ne ?? undefined,
      saveDetail: dto.saveDetail || SaveDetail.YES,
      feeRemarks: dto.feeRemarks,
      previousBalanceIfAny: n(dto.previousBalanceIfAny),
      waivedOffAmount: n(dto.waivedOffAmount),
      extendedDays: n(dto.extendedDays),
      expectedAmount: q.amount,
    });

    // Server is the authority: recompute derived state from the full fee history.
    const updated = await this.engine.recomputeForStudent(student._id);

    // Fee-received WhatsApp confirmation (§6.5) — best-effort, never blocks the response.
    const nm = [student.name?.prefix, student.name?.first, student.name?.last].filter(Boolean).join(' ').trim();
    const due = updated?.latestDueDate ? formatIST(new Date(updated.latestDueDate)) : '';
    const message =
      dto.feeType === FeeType.OTHER
        ? `Hello ${nm}, we have received your payment of Rs. ${q.amount}${dto.feeRemarks ? ` for ${dto.feeRemarks}` : ''}. Thank you!`
        : `Hello ${nm}, we have received your fee payment of Rs. ${q.amountPaid}. Your subscription is now valid till ${due}. Thank you!`;
    await this.whatsapp.sendConfirmation({
      to: student.phoneNumber,
      message,
      studentId: student._id as any,
      branchId: student.branchId as any,
    });

    return {
      feeRecord: rec,
      student: {
        _id: student._id,
        name: student.name,
        latestDueDate: updated?.latestDueDate ?? null,
        latestPaymentStatus: updated?.latestPaymentStatus ?? null,
        balance: n(updated?.balance),
        overdueThisMonth: updated?.overdueThisMonth ?? null,
        expectedAmountThisMonth: n(updated?.expectedAmountThisMonth),
      },
    };
  }

  list(user: AuthUser, q: FeeQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.studentId) filter.studentId = new Types.ObjectId(q.studentId);
    if (q.batchId) filter.batchId = new Types.ObjectId(q.batchId);
    if (q.feeType) filter.feeType = q.feeType;
    if (q.dateFrom || q.dateTo) {
      filter.paymentDate = {};
      if (q.dateFrom) filter.paymentDate.$gte = new Date(q.dateFrom);
      if (q.dateTo) filter.paymentDate.$lte = new Date(q.dateTo);
    }
    return paginate(this.feeModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'paymentDate',
      sortOrder: q.sortOrder,
      populate: [
        { path: 'studentId', select: 'name phoneNumber' },
        { path: 'batchId', select: 'batchName' },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const rec = await this.feeModel
      .findById(id)
      .populate('studentId', 'name phoneNumber')
      .populate('batchId', 'batchName')
      .populate('branchId', 'name')
      .lean()
      .exec();
    if (!rec) throw new NotFoundException('Fee record not found');
    assertBranchAccess(user, String((rec.branchId as any)?._id ?? rec.branchId));
    return rec;
  }

  async studentFees(user: AuthUser, studentId: string) {
    await this.ownedStudent(user, studentId); // authorize
    return this.feeModel.find({ studentId: new Types.ObjectId(studentId) }).sort({ paymentDate: -1 }).lean().exec();
  }

  /** Students who owe: overdue-this-month, or a non-Paid latest status (Requirements §21). */
  pending(user: AuthUser, q: FeeQueryDto) {
    const filter: Record<string, any> = {
      ...resolveBranchFilter(user, q.branchId),
      activeStatus: ActiveStatus.ACTIVE,
      $or: [
        { overdueThisMonth: OverdueThisMonth.YES },
        { latestPaymentStatus: { $in: [...OVERDUE_STATUSES, LatestPaymentStatus.BALANCE, LatestPaymentStatus.UNPAID] } },
      ],
    };
    if (q.batchId) filter.batchId = new Types.ObjectId(q.batchId);
    return paginate(this.studentModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'expectedAmountThisMonth',
      sortOrder: q.sortOrder,
      populate: [
        { path: 'batchId', select: 'batchName' },
        { path: 'branchId', select: 'name' },
      ],
    });
  }

  recompute(user: AuthUser, branchId?: string) {
    return this.engine.recomputeAll(user, branchId);
  }
}
