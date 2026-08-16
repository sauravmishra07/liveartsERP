import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { EmployeeStatus } from '../common/enums';
import { assertBranchAccess, resolveBranchFilter } from '../common/utils/branch-scope.util';
import { startOfDayIST } from '../common/utils/date.util';
import { paginate } from '../common/utils/query.util';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import {
  EmployeeAttendanceQueryDto,
  MarkEmployeeAttendanceBulkDto,
  MarkEmployeeAttendanceDto,
} from './dto/employee-attendance.dto';
import {
  EmployeeAttendance,
  EmployeeAttendanceDocument,
} from './schemas/employee-attendance.schema';

@Injectable()
export class EmployeeAttendanceService {
  constructor(
    @InjectModel(EmployeeAttendance.name) private readonly model: Model<EmployeeAttendanceDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
  ) {}

  private dayKey(dateStr: string): Date {
    return startOfDayIST(new Date(dateStr));
  }

  async mark(user: AuthUser, dto: MarkEmployeeAttendanceDto) {
    const emp = await this.empModel.findById(dto.employeeId).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    assertBranchAccess(user, String(emp.branchId));
    const date = this.dayKey(dto.date);
    return this.model
      .findOneAndUpdate(
        { employeeId: emp._id, date },
        { $set: { status: dto.status, branchId: emp.branchId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async markBulk(user: AuthUser, dto: MarkEmployeeAttendanceBulkDto) {
    const date = this.dayKey(dto.date);
    // Look up each employee's branch and enforce access.
    const ids = dto.records.map((r) => new Types.ObjectId(r.employeeId));
    const emps = await this.empModel.find({ _id: { $in: ids } }).select('branchId').lean().exec();
    const branchById = new Map(emps.map((e) => [String(e._id), e.branchId]));
    const ops = dto.records
      .filter((r) => branchById.has(r.employeeId))
      .map((r) => {
        const branchId = branchById.get(r.employeeId);
        assertBranchAccess(user, String(branchId));
        return {
          updateOne: {
            filter: { employeeId: new Types.ObjectId(r.employeeId), date },
            update: { $set: { status: r.status, branchId } },
            upsert: true,
          },
        };
      });
    if (ops.length) await this.model.bulkWrite(ops);
    return { marked: ops.length, date };
  }

  list(user: AuthUser, q: EmployeeAttendanceQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.employeeId) filter.employeeId = new Types.ObjectId(q.employeeId);
    if (q.date) filter.date = this.dayKey(q.date);
    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'date',
      sortOrder: q.sortOrder,
      populate: [{ path: 'employeeId', select: 'name' }],
    });
  }

  /** Active employees + their status for a date (marking grid). */
  async roster(user: AuthUser, dateStr?: string, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const date = this.dayKey(dateStr || new Date().toISOString());
    const employees = await this.empModel
      .find({ ...branchFilter, activeStatus: EmployeeStatus.ACTIVE })
      .select('name phone salaryType branchId')
      .sort({ 'name.first': 1 })
      .lean()
      .exec();
    const records = await this.model
      .find({ date, employeeId: { $in: employees.map((e) => e._id) } })
      .select('employeeId status')
      .lean()
      .exec();
    const statusById = new Map(records.map((r) => [String(r.employeeId), r.status]));
    return {
      date,
      employees: employees.map((e) => ({ ...e, status: statusById.get(String(e._id)) ?? null })),
    };
  }
}
