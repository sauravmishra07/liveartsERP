import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { StudentStatus } from '../common/enums';
import {
  assertBranchAccess,
  branchForWrite,
  resolveBranchFilter,
} from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import {
  ChangeBatchDto,
  CreateStudentDto,
  SetBreakDto,
  StudentQueryDto,
  UpdateStudentDto,
  UpdateStudentStatusDto,
} from './dto/student.dto';
import { Student, StudentDocument } from './schemas/student.schema';

// Fields whose changes are written to the audit log (Requirements §30).
const TRACKED = [
  'studentStatus',
  'activeStatus',
  'joiningDate',
  'batchId',
  'preferredFeePackage',
  'monthlyFee',
  'packageFee',
  'attendanceBasedFee',
  'balance',
] as const;

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private readonly model: Model<StudentDocument>,
    private readonly audit: AuditService,
  ) {}

  private ageFromDob(dob: Date): number {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  create(user: AuthUser, dto: CreateStudentDto) {
    const branchId = branchForWrite(user, dto.branchId);
    const doc: Record<string, unknown> = {
      ...dto,
      branchId,
      batchId: dto.batchId ? new Types.ObjectId(dto.batchId) : undefined,
      // Actual joining defaults to joining on first admission.
      actualJoiningDate: dto.actualJoiningDate ?? dto.joiningDate,
    };
    if (dto.dateOfBirth) doc.age = this.ageFromDob(new Date(dto.dateOfBirth));
    return this.model.create(doc);
  }

  list(user: AuthUser, q: StudentQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.activeStatus) filter.activeStatus = q.activeStatus;
    if (q.studentStatus) filter.studentStatus = q.studentStatus;
    if (q.batchId) filter.batchId = new Types.ObjectId(q.batchId);
    if (q.latestPaymentStatus) filter.latestPaymentStatus = q.latestPaymentStatus;
    if (q.overdueThisMonth) filter.overdueThisMonth = q.overdueThisMonth;
    if (q.search) {
      const rx = { $regex: q.search, $options: 'i' };
      filter.$or = [
        { 'name.first': rx },
        { 'name.last': rx },
        { phoneNumber: rx },
      ];
    }

    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      populate: [
        { path: 'batchId', select: 'batchName activity' },
        { path: 'branchId', select: 'name' },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const s = await this.model
      .findById(id)
      .populate('batchId', 'batchName activity days')
      .populate('branchId', 'name')
      .exec();
    if (!s) throw new NotFoundException('Student not found');
    // branchId is populated here → read its _id for the access check.
    assertBranchAccess(user, String((s.branchId as any)?._id ?? s.branchId));
    return s;
  }

  async update(user: AuthUser, id: string, dto: UpdateStudentDto) {
    const s = await this.model.findById(id).exec();
    if (!s) throw new NotFoundException('Student not found');
    assertBranchAccess(user, String(s.branchId));

    const before: Record<string, unknown> = {};
    for (const f of TRACKED) before[f] = (s as any)[f];

    const patch: Record<string, unknown> = { ...dto };
    delete patch.branchId; // branch moves not allowed via update
    if (dto.batchId) patch.batchId = new Types.ObjectId(dto.batchId);
    if (dto.dateOfBirth) patch.age = this.ageFromDob(new Date(dto.dateOfBirth));
    Object.assign(s, patch);
    await s.save();

    await this.auditDiff(user, s, before);
    return s;
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateStudentStatusDto) {
    const s = await this.getOwned(user, id);
    const old = s.studentStatus;
    s.studentStatus = dto.studentStatus;
    if (dto.remarks !== undefined) s.studentStatusRemarks = dto.remarks;
    await s.save();
    if (old !== dto.studentStatus) {
      await this.audit.record({
        studentId: s._id,
        fieldChanged: 'studentStatus',
        oldValue: old,
        newValue: dto.studentStatus,
        changedBy: user.id,
        branchId: s.branchId,
      });
    }
    return s;
  }

  async changeBatch(user: AuthUser, id: string, dto: ChangeBatchDto) {
    const s = await this.getOwned(user, id);
    const old = s.batchId ? String(s.batchId) : '';
    s.batchId = new Types.ObjectId(dto.batchId);
    await s.save();
    if (old !== dto.batchId) {
      await this.audit.record({
        studentId: s._id,
        fieldChanged: 'batchId',
        oldValue: old,
        newValue: dto.batchId,
        changedBy: user.id,
        branchId: s.branchId,
      });
    }
    return s;
  }

  async setBreak(user: AuthUser, id: string, dto: SetBreakDto) {
    const s = await this.getOwned(user, id);
    const old = s.studentStatus;
    s.studentStatus = dto.onBreak
      ? StudentStatus.ON_BREAK
      : StudentStatus.REGULAR;
    if (dto.remarks !== undefined) s.studentStatusRemarks = dto.remarks;
    await s.save();
    await this.audit.record({
      studentId: s._id,
      fieldChanged: 'studentStatus',
      oldValue: old,
      newValue: s.studentStatus,
      changedBy: user.id,
      branchId: s.branchId,
    });
    return s;
  }

  async changeHistory(user: AuthUser, id: string) {
    await this.getOwned(user, id); // authorize
    return this.audit.listForStudent(id);
  }

  // --- helpers ---
  private async getOwned(user: AuthUser, id: string): Promise<StudentDocument> {
    const s = await this.model.findById(id).exec();
    if (!s) throw new NotFoundException('Student not found');
    assertBranchAccess(user, String(s.branchId));
    return s;
  }

  private async auditDiff(
    user: AuthUser,
    s: StudentDocument,
    before: Record<string, unknown>,
  ) {
    for (const f of TRACKED) {
      const oldV = before[f];
      const newV = (s as any)[f];
      if (String(oldV ?? '') !== String(newV ?? '')) {
        await this.audit.record({
          studentId: s._id,
          fieldChanged: f,
          oldValue: oldV,
          newValue: newV,
          changedBy: user.id,
          branchId: s.branchId,
        });
      }
    }
  }
}
