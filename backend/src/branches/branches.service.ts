import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CROSS_BRANCH_ROLES } from '../common/enums';
import { assertBranchAccess } from '../common/utils/branch-scope.util';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly model: Model<BranchDocument>,
  ) {}

  /** SUPER_ADMIN sees all branches; others see only their own. */
  async list(user: AuthUser) {
    if (CROSS_BRANCH_ROLES.includes(user.role)) {
      return this.model.find().sort({ name: 1 }).exec();
    }
    return this.model
      .find({ _id: user.branchId })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(user: AuthUser, id: string) {
    assertBranchAccess(user, id);
    const branch = await this.model.findById(id).exec();
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  create(dto: CreateBranchDto) {
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async findByNameOrCreate(name: string, legacyId?: string) {
    const existing = await this.model.findOne({ name }).exec();
    if (existing) return existing;
    return this.model.create({ name, legacyId });
  }
}
