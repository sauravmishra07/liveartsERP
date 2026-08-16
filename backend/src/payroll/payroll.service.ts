import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ActiveStatus,
  EmployeeAttendanceStatus,
  EmployeeStatus,
  ExpenseStatus,
  ExpenseType,
  OverdueThisMonth,
  SalaryType,
  StudentStatus,
} from '../common/enums';
import { resolveBranchFilter } from '../common/utils/branch-scope.util';
import { endOfMonthIST, startOfMonthIST } from '../common/utils/date.util';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { EmployeeAttendance, EmployeeAttendanceDocument } from '../employee-attendance/schemas/employee-attendance.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { FeeRecord, FeeRecordDocument } from '../fees/schemas/fee-record.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';

const n = (v: any): number => Number(v || 0);
const nameOf = (name: any): string =>
  [name?.prefix, name?.first, name?.last].filter(Boolean).join(' ').trim() || 'Employee';

/** Payroll calculation engine (Requirements §6.7). */
@Injectable()
export class PayrollService {
  private readonly floorNegative: boolean;

  constructor(
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(EmployeeAttendance.name) private readonly attModel: Model<EmployeeAttendanceDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(FeeRecord.name) private readonly feeModel: Model<FeeRecordDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    config: ConfigService,
  ) {
    this.floorNegative = !!config.get('payrollFloorNegativeLeaveDeduction');
  }

  private range(month?: string) {
    const d = month ? new Date(month) : new Date();
    return { start: startOfMonthIST(d), end: endOfMonthIST(d) };
  }

  async computeForEmployee(emp: any, start: Date, end: Date) {
    const attendance = await this.attModel
      .find({ employeeId: emp._id, date: { $gte: start, $lte: end } })
      .select('status')
      .lean()
      .exec();
    const presents = attendance.filter((a) => a.status === EmployeeAttendanceStatus.PRESENT).length;
    const absents = attendance.filter((a) => a.status === EmployeeAttendanceStatus.ABSENT).length;
    const uninformed = attendance.filter((a) => a.status === EmployeeAttendanceStatus.UNINFORMED_LEAVE).length;

    const batchIds = (emp.batchIds || []) as Types.ObjectId[];
    const batchCount = batchIds.length;
    const freeLeaves = n(emp.freeLeaves);
    const dPerLeave = n(emp.deductionPerLeave);
    const dPerUninformed = n(emp.deductionPerUninformedLeave);
    const incentive = n(emp.extraIncentive);

    let finalLeaves = absents - freeLeaves;
    if (this.floorNegative) finalLeaves = Math.max(0, finalLeaves);
    const totalDeduction = finalLeaves * dPerLeave + uninformed * dPerUninformed;

    let base = 0;
    let collectionBase = 0;
    let finalSalary = 0;

    if (emp.salaryType === SalaryType.FIXED) {
      base = n(emp.fixedSalary) * Math.max(batchCount, 1);
      finalSalary = base - totalDeduction + incentive;
    } else if (emp.salaryType === SalaryType.CLASS_WISE) {
      base = n(emp.classWiseSalary);
      finalSalary = presents * base;
    } else if (emp.salaryType === SalaryType.PERCENTAGE) {
      const students = await this.studentModel
        .find({ batchId: { $in: batchIds }, activeStatus: ActiveStatus.ACTIVE, studentStatus: { $ne: StudentStatus.ON_BREAK } })
        .select('_id expectedAmountThisMonth overdueThisMonth')
        .lean()
        .exec();
      for (const stu of students) {
        if (stu.overdueThisMonth === OverdueThisMonth.YES) {
          collectionBase += n(stu.expectedAmountThisMonth);
        } else if (stu.overdueThisMonth === OverdueThisMonth.CLEARED) {
          const recs = await this.feeModel
            .find({ studentId: stu._id, paymentDate: { $gte: start, $lte: end } })
            .select('amountPaid')
            .lean()
            .exec();
          collectionBase += recs.reduce((s, r) => s + n(r.amountPaid), 0);
        }
      }
      base = collectionBase;
      finalSalary = (n(emp.percentage) * collectionBase) / 100 - totalDeduction;
    }

    return {
      employeeId: emp._id,
      branchId: emp.branchId,
      name: nameOf(emp.name),
      salaryType: emp.salaryType,
      batchCount,
      presents,
      absents,
      uninformed,
      freeLeaves,
      totalDeduction: Math.round(totalDeduction),
      incentive,
      base: Math.round(base),
      collectionBase: Math.round(collectionBase),
      finalSalary: Math.round(finalSalary),
    };
  }

  async computeAll(user: AuthUser, month?: string, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const { start, end } = this.range(month);
    const employees = await this.empModel.find({ ...branchFilter, activeStatus: EmployeeStatus.ACTIVE }).lean().exec();
    const rows = [];
    for (const emp of employees) rows.push(await this.computeForEmployee(emp, start, end));
    return { month: start, rows };
  }

  /** Post salaries as Salary expenses for the month (idempotent per employee+month). */
  async postSalaries(user: AuthUser, month?: string, branchId?: string) {
    const { start, end } = this.range(month);
    const { rows } = await this.computeAll(user, month, branchId);
    let posted = 0;
    for (const r of rows) {
      if (r.finalSalary > 0) {
        await this.expenseModel
          .findOneAndUpdate(
            { linkedEmployeeId: r.employeeId, expenseType: ExpenseType.SALARY, fromDate: start, toDate: end },
            {
              $set: {
                title: `${r.name} Salary`,
                expenseType: ExpenseType.SALARY,
                expenseStatus: ExpenseStatus.UNPAID,
                fromDate: start,
                toDate: end,
                expectedExpense: r.finalSalary,
                amount: r.finalSalary,
                realtimeSalaryCalculation: r.finalSalary,
                linkedEmployeeId: r.employeeId,
                branchId: r.branchId,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          .exec();
        posted++;
      }
    }
    return { posted, month: start };
  }
}
