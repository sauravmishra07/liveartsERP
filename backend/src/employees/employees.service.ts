import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  assertBranchAccess,
  branchForWrite,
  resolveBranchFilter,
} from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import {
  CreateEmployeeDto,
  EmployeeQueryDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { Employee, EmployeeDocument } from './schemas/employee.schema';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private readonly model: Model<EmployeeDocument>,
  ) {}

  create(user: AuthUser, dto: CreateEmployeeDto) {
    const branchId = branchForWrite(user, dto.branchId);
    return this.model.create({
      ...dto,
      branchId,
      batchIds: (dto.batchIds ?? []).map((id) => new Types.ObjectId(id)),
    });
  }

  list(user: AuthUser, q: EmployeeQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.activeStatus) filter.activeStatus = q.activeStatus;
    if (q.salaryType) filter.salaryType = q.salaryType;
    if (q.search) filter['name.first'] = { $regex: q.search, $options: 'i' };

    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      populate: { path: 'batchIds', select: 'name' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const emp = await this.model.findById(id).populate('batchIds', 'name').exec();
    if (!emp) throw new NotFoundException('Employee not found');
    assertBranchAccess(user, String(emp.branchId));
    return emp;
  }

  async update(user: AuthUser, id: string, dto: UpdateEmployeeDto) {
    const emp = await this.model.findById(id).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    assertBranchAccess(user, String(emp.branchId));

    const patch: Partial<UpdateEmployeeDto> = { ...dto };
    delete patch.batchIds;
    // Branch moves are not allowed via update (avoid branch escalation).
    delete patch.branchId;

    Object.assign(emp, patch);
    if (dto.batchIds) {
      emp.batchIds = dto.batchIds.map((b) => new Types.ObjectId(b));
    }
    await emp.save();
    return emp;
  }
}
