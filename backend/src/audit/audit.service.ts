import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import { resolveBranchFilter } from '../common/utils/branch-scope.util';
import {
  ChangeHistory,
  ChangeHistoryDocument,
} from './schemas/change-history.schema';

export interface RecordChange {
  studentId?: string | Types.ObjectId;
  fieldChanged: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string | Types.ObjectId;
  branchId?: string | Types.ObjectId | null;
}

/** Reusable audit log (Requirements §30). Call `record()` whenever a tracked field changes. */
@Injectable()
export class AuditService {
  constructor(
    @InjectModel(ChangeHistory.name)
    private readonly model: Model<ChangeHistoryDocument>,
  ) {}

  private toStr(v: unknown): string | undefined {
    if (v === undefined || v === null) return undefined;
    return typeof v === 'string' ? v : String(v);
  }

  async record(change: RecordChange): Promise<void> {
    await this.model.create({
      studentId: change.studentId
        ? new Types.ObjectId(change.studentId)
        : undefined,
      fieldChanged: change.fieldChanged,
      oldValue: this.toStr(change.oldValue),
      newValue: this.toStr(change.newValue),
      changedBy: change.changedBy
        ? new Types.ObjectId(change.changedBy)
        : undefined,
      branchId: change.branchId
        ? new Types.ObjectId(change.branchId)
        : undefined,
      changeDate: new Date(),
    });
  }

  listForStudent(studentId: string) {
    return this.model
      .find({ studentId: new Types.ObjectId(studentId) })
      .sort({ changeDate: -1 })
      .lean()
      .exec();
  }

  /** Branch-scoped, paginated change log for the Audit History screen (Requirements §30). */
  async list(
    user: AuthUser,
    query: PaginationDto & { branchId?: string; field?: string; studentId?: string },
  ) {
    const filter: Record<string, any> = {
      ...resolveBranchFilter(user, query.branchId),
    };
    if (query.field) filter.fieldChanged = query.field;
    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);
    if (query.search) {
      const rx = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ fieldChanged: rx }, { oldValue: rx }, { newValue: rx }];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ changeDate: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('studentId', 'name formNo')
        .populate('changedBy', 'name email')
        .populate('branchId', 'name')
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  /** Distinct field names present in the log — powers the filter dropdown. */
  fields(user: AuthUser, branchId?: string) {
    return this.model.distinct('fieldChanged', resolveBranchFilter(user, branchId));
  }
}
