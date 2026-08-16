import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { BatchStatus } from '../common/enums';
import {
  assertBranchAccess,
  branchForWrite,
  resolveBranchFilter,
} from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import { BatchQueryDto, CreateBatchDto, UpdateBatchDto } from './dto/batch.dto';
import { Batch, BatchDocument } from './schemas/batch.schema';

@Injectable()
export class BatchesService {
  constructor(
    @InjectModel(Batch.name) private readonly model: Model<BatchDocument>,
  ) {}

  create(user: AuthUser, dto: CreateBatchDto) {
    const branchId = branchForWrite(user, dto.branchId);
    return this.model.create({
      ...dto,
      branchId,
      teacherId: dto.teacherId ? new Types.ObjectId(dto.teacherId) : undefined,
    });
  }

  list(user: AuthUser, q: BatchQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.activity) filter.activity = q.activity;
    if (q.status) filter.status = q.status;
    if (q.teacherId) filter.teacherId = new Types.ObjectId(q.teacherId);
    if (q.search) filter.batchName = { $regex: q.search, $options: 'i' };

    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      populate: { path: 'teacherId', select: 'name phone' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const batch = await this.model
      .findById(id)
      .populate('teacherId', 'name phone')
      .exec();
    if (!batch) throw new NotFoundException('Batch not found');
    assertBranchAccess(user, String(batch.branchId));
    return batch;
  }

  async update(user: AuthUser, id: string, dto: UpdateBatchDto) {
    const batch = await this.model.findById(id).exec();
    if (!batch) throw new NotFoundException('Batch not found');
    assertBranchAccess(user, String(batch.branchId));

    const patch: Partial<UpdateBatchDto> = { ...dto };
    delete patch.branchId; // no branch moves via update
    Object.assign(batch, patch);
    if (dto.teacherId) batch.teacherId = new Types.ObjectId(dto.teacherId);
    await batch.save();
    return batch;
  }

  /** Used by attendance/jobs — active batches for a branch. */
  activeForBranch(branchId: Types.ObjectId | string) {
    return this.model
      .find({ branchId: new Types.ObjectId(branchId), status: BatchStatus.ACTIVE })
      .exec();
  }
}
