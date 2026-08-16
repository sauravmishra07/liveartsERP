/**
 * Seed (Requirements §34).
 *
 * Creates the exact .ds reference data (branches NIT 5 + Jawahar Colony, legacy ids)
 * plus a realistic SAMPLE dataset (employees, batches, students, fees, attendance,
 * enquiries, expenses) so dashboards/reports are demonstrable. All sample records are
 * clearly synthetic and meant to be REPLACED by a real Zoho CSV import later.
 *
 * Idempotent: if students already exist it skips. To reseed:
 *   npx ts-node -r tsconfig-paths/register src/reset-data.ts && npm run seed
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import {
  ActiveStatus,
  EmployeeAttendanceStatus,
  EmployeeStatus,
  EnquiryStatus,
  ExpenseReferenceType,
  ExpenseStatus,
  ExpenseType,
  FeeRecordPaymentStatus,
  FeeType,
  SalaryType,
  SaveDetail,
  StudentAttendanceStatus,
  StudentStatus,
} from './common/enums';
import { addDays, startOfDayIST, startOfMonthIST } from './common/utils/date.util';
import { BranchesService } from './branches/branches.service';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums';
import { JobsService, SYSTEM_USER } from './jobs/jobs.service';
import { Batch } from './batches/schemas/batch.schema';
import { Employee } from './employees/schemas/employee.schema';
import { EmployeeAttendance } from './employee-attendance/schemas/employee-attendance.schema';
import { Enquiry } from './crm/schemas/enquiry.schema';
import { Expense } from './expenses/schemas/expense.schema';
import { FeeRecord } from './fees/schemas/fee-record.schema';
import { Student } from './students/schemas/student.schema';
import { StudentAttendance } from './attendance/schemas/student-attendance.schema';

const FIRST =['Aarav', 'Vivaan', 'Aditya', 'Ananya', 'Diya', 'Ishaan', 'Kavya', 'Riya', 'Arjun', 'Sara', 'Kabir', 'Meera', 'Rohan', 'Anika', 'Dev', 'Tara', 'Nikhil', 'Priya', 'Karan', 'Neha'];
const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Nair', 'Das', 'Mehta'];
const GENDERS = ['Male', 'Female'];
const phone = (i: number) => `9${String(800000000 + i * 12345).slice(0, 9)}`;

async function run() {
  const log = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });

  const branches = app.get(BranchesService);
  const users = app.get(UsersService);
  const config = app.get(ConfigService);
  const empModel = app.get<Model<any>>(getModelToken(Employee.name));
  const batchModel = app.get<Model<any>>(getModelToken(Batch.name));
  const studentModel = app.get<Model<any>>(getModelToken(Student.name));
  const attModel = app.get<Model<any>>(getModelToken(StudentAttendance.name));
  const empAttModel = app.get<Model<any>>(getModelToken(EmployeeAttendance.name));
  const feeModel = app.get<Model<any>>(getModelToken(FeeRecord.name));
  const enquiryModel = app.get<Model<any>>(getModelToken(Enquiry.name));
  const expenseModel = app.get<Model<any>>(getModelToken(Expense.name));
  const jobs = app.get(JobsService);

  try {
    const nit = await branches.findByNameOrCreate('NIT 5', '287579000000065017');
    const jc = await branches.findByNameOrCreate('Jawahar Colony', '287579000000065011');

    // Users
    await ensureUser(users, config.get('seed.adminEmail')!, config.get('seed.adminPassword')!, 'Super Admin', UserRole.SUPER_ADMIN);
    await ensureUser(users, 'nit.admin@livearts.local', 'Admin@12345', 'NIT Branch Admin', UserRole.BRANCH_ADMIN, String(nit._id));
    await ensureUser(users, 'jc.admin@livearts.local', 'Admin@12345', 'JC Branch Admin', UserRole.BRANCH_ADMIN, String(jc._id));

    if ((await studentModel.countDocuments()) > 0) {
      log.log('Sample data already present — skipping. (run reset-data.ts to reseed)');
      await app.close();
      return;
    }

    const today = startOfDayIST(new Date());
    const monthStart = startOfMonthIST(new Date());

    // --- Employees (teachers) ---
    const empDefs = [
      { first: 'Rahul', last: 'Sharma', branch: nit._id, salaryType: SalaryType.FIXED, fixedSalary: 25000, freeLeaves: 2, deductionPerLeave: 500, deductionPerUninformedLeave: 800, extraIncentive: 1000 },
      { first: 'Neha', last: 'Gupta', branch: nit._id, salaryType: SalaryType.CLASS_WISE, classWiseSalary: 400 },
      { first: 'Amit', last: 'Singh', branch: nit._id, salaryType: SalaryType.PERCENTAGE, percentage: 30, freeLeaves: 1, deductionPerLeave: 400 },
      { first: 'Pooja', last: 'Rani', branch: jc._id, salaryType: SalaryType.FIXED, fixedSalary: 22000, freeLeaves: 2, deductionPerLeave: 450 },
      { first: 'Vikram', last: 'Das', branch: jc._id, salaryType: SalaryType.CLASS_WISE, classWiseSalary: 350 },
    ];
    const emps = await empModel.insertMany(
      empDefs.map((e) => ({
        name: { first: e.first, last: e.last },
        phone: phone(Math.floor(Math.random() * 100)),
        activeStatus: EmployeeStatus.ACTIVE,
        branchId: e.branch,
        salaryType: e.salaryType,
        fixedSalary: e.fixedSalary || 0,
        classWiseSalary: e.classWiseSalary || 0,
        percentage: e.percentage || 0,
        freeLeaves: e.freeLeaves || 0,
        deductionPerLeave: e.deductionPerLeave || 0,
        deductionPerUninformedLeave: e.deductionPerUninformedLeave || 0,
        extraIncentive: e.extraIncentive || 0,
      })),
    );

    // --- Batches ---
    const batchDefs = [
      { name: 'Hip-Hop Beginners', activity: 'Dance', branch: nit._id, teacher: emps[0]._id, days: ['Monday', 'Wednesday', 'Friday'], timings: '5:00 PM - 6:00 PM', monthlyFee: 2000, packageFee: 5500 },
      { name: 'Ballet Intermediate', activity: 'Dance', branch: nit._id, teacher: emps[1]._id, days: ['Tuesday', 'Thursday'], timings: '6:00 PM - 7:00 PM', monthlyFee: 2500, packageFee: 7000 },
      { name: 'Guitar Basics', activity: 'Guitar', branch: nit._id, teacher: emps[2]._id, days: ['Saturday', 'Sunday'], timings: '11:00 AM - 12:00 PM', monthlyFee: 1800, packageFee: 5000 },
      { name: 'Morning Fitness', activity: 'Fitness', branch: nit._id, teacher: emps[0]._id, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], timings: '7:00 AM - 8:00 AM', monthlyFee: 1500 },
      { name: 'Bollywood Dance', activity: 'Dance', branch: jc._id, teacher: emps[3]._id, days: ['Monday', 'Wednesday'], timings: '5:30 PM - 6:30 PM', monthlyFee: 1800, packageFee: 5000 },
      { name: 'Vocal + Keyboard', activity: 'Vocal + Keyboard', branch: jc._id, teacher: emps[4]._id, days: ['Tuesday', 'Thursday'], timings: '6:00 PM - 7:00 PM', monthlyFee: 2200 },
      { name: 'Gymnastics Kids', activity: 'Gymnastics', branch: jc._id, teacher: emps[3]._id, days: ['Saturday'], timings: '10:00 AM - 11:00 AM', monthlyFee: 2000 },
    ];
    const batches = await batchModel.insertMany(
      batchDefs.map((b) => ({
        batchName: b.name,
        activity: b.activity,
        branchId: b.branch,
        teacherId: b.teacher,
        days: b.days,
        timings: b.timings,
        monthlyFee: b.monthlyFee,
        packageFee: b.packageFee || 0,
        status: 'Active',
      })),
    );

    // assign teacher batchIds
    for (const b of batches) {
      await empModel.updateOne({ _id: b.teacherId }, { $addToSet: { batchIds: b._id } });
    }

    // --- Students (36) ---
    const N = 36;
    const studentDocs: any[] = [];
    for (let i = 0; i < N; i++) {
      const batch = batches[i % batches.length];
      const joiningDate = addDays(today, -(12 + (i % 12) * 20)); // 12–232 days ago
      studentDocs.push({
        formNo: 1000 + i,
        activeStatus: i % 11 === 0 ? ActiveStatus.INACTIVE : ActiveStatus.ACTIVE,
        studentStatus: StudentStatus.NEW,
        branchId: batch.branchId,
        batchId: batch._id,
        joiningDate,
        actualJoiningDate: joiningDate,
        name: { first: FIRST[i % FIRST.length], last: LAST[i % LAST.length] },
        gender: GENDERS[i % 2],
        dateOfBirth: addDays(today, -(8 + (i % 15)) * 365),
        phoneNumber: phone(i),
        guardianName: `${LAST[(i + 3) % LAST.length]} (Parent)`,
        guardianRelation: i % 2 ? 'Father' : 'Mother',
        primaryContactPerson: 'Father',
        preferredFeePackage: FeeType.MONTHLY,
        monthlyFee: batch.monthlyFee,
        balance: 0,
      });
    }
    const students = await studentModel.insertMany(studentDocs);

    // --- Fee records (varied payment scenarios) + attendance ---
    const feeDocs: any[] = [];
    const attDocs: any[] = [];
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (s.activeStatus !== ActiveStatus.ACTIVE) continue;
      const batch = batches[i % batches.length];
      const scenario = i % 5; // 0 unpaid · 1 overdue · 2 balance · 3,4 paid-current
      if (scenario !== 0) {
        const overdue = scenario === 1;
        const balance = scenario === 2;
        const ne = overdue ? addDays(today, -(5 + (i % 4) * 20)) : addDays(today, 8 + (i % 20));
        const oldDue = addDays(ne, -30);
        const amount = s.monthlyFee;
        const paid = balance ? Math.round(amount * 0.6) : amount;
        feeDocs.push({
          studentId: s._id,
          paymentDate: addDays(oldDue, 1),
          branchId: s.branchId,
          batchId: s.batchId,
          feeType: FeeType.MONTHLY,
          noOfDaysMonths: 30,
          modeOfPayment: i % 3 === 0 ? ['Online'] : ['Cash'],
          cashAmount: i % 3 === 0 ? 0 : paid,
          onlineAmount: i % 3 === 0 ? paid : 0,
          amountPaid: paid,
          amount,
          balance: amount - paid,
          paymentStatus: amount - paid === 0 ? FeeRecordPaymentStatus.PAID_OR_CLEARED : FeeRecordPaymentStatus.BALANCE,
          oldDueDate: oldDue,
          ne,
          saveDetail: SaveDetail.YES,
        });
      }
      // attendance: last 6 days, mark class days
      for (let d = 0; d < 6; d++) {
        const date = addDays(today, -d);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
        if (!batch.days.includes(dayName)) continue;
        if (date.getTime() < startOfDayIST(new Date(s.joiningDate)).getTime()) continue;
        const present = (i + d) % 4 !== 0; // ~75% present
        attDocs.push({
          studentId: s._id,
          date: startOfDayIST(date),
          status: present ? StudentAttendanceStatus.PRESENT : StudentAttendanceStatus.ABSENT,
          batchId: s.batchId,
          branchId: s.branchId,
        });
      }
    }
    if (feeDocs.length) await feeModel.insertMany(feeDocs);
    if (attDocs.length) await attModel.insertMany(attDocs);

    // --- Employee attendance (this month, for payroll) ---
    const empAttDocs: any[] = [];
    for (const e of emps) {
      for (let d = 0; d < 20; d++) {
        const date = addDays(monthStart, d);
        if (date.getTime() > today.getTime()) break;
        const r = (Number(e._id.toString().slice(-1)) + d) % 7;
        const status = r === 0 ? EmployeeAttendanceStatus.ABSENT : r === 6 ? EmployeeAttendanceStatus.UNINFORMED_LEAVE : EmployeeAttendanceStatus.PRESENT;
        empAttDocs.push({ employeeId: e._id, date: startOfDayIST(date), status, branchId: e.branchId });
      }
    }
    if (empAttDocs.length) await empAttModel.insertMany(empAttDocs);

    // --- Enquiries ---
    const enqStatuses = [EnquiryStatus.NEW, EnquiryStatus.FOLLOW_UP, EnquiryStatus.DEMO_SCHEDULED, EnquiryStatus.NEGOTIATING, EnquiryStatus.LOST, EnquiryStatus.NEW, EnquiryStatus.DEMO_ATTENDED];
    await enquiryModel.insertMany(
      enqStatuses.map((st, i) => ({
        name: { first: FIRST[(i + 5) % FIRST.length], last: LAST[(i + 2) % LAST.length] },
        phone: phone(200 + i),
        source: ['Instagram', 'Walk-in', 'Referral', 'Google'][i % 4],
        interestedActivity: ['Dance', 'Guitar', 'Fitness', 'Vocal + Keyboard'][i % 4],
        status: st,
        branchId: i % 2 ? jc._id : nit._id,
        nextFollowUpDate: addDays(today, 2 + i),
      })),
    );

    // --- Expenses ---
    await expenseModel.insertMany([
      { title: 'Studio Rent', expenseType: ExpenseType.ONE_TIME, expenseStatus: ExpenseStatus.PAID, amount: 30000, fromDate: monthStart, branchId: nit._id },
      { title: 'Electricity', expenseType: ExpenseType.REOCCURRING, expenseStatus: ExpenseStatus.UNPAID, amount: 5000, autoAdd: true, reoccurringFrequency: 1, deriveExpectedExpenseFrom: ExpenseReferenceType.LAST_EXPENSE, fromDate: addDays(monthStart, -30), branchId: nit._id },
      { title: 'Studio Rent', expenseType: ExpenseType.ONE_TIME, expenseStatus: ExpenseStatus.PAID, amount: 25000, fromDate: monthStart, branchId: jc._id },
      { title: 'Internet', expenseType: ExpenseType.REOCCURRING, expenseStatus: ExpenseStatus.UNPAID, amount: 2000, autoAdd: true, reoccurringFrequency: 1, deriveExpectedExpenseFrom: ExpenseReferenceType.LAST_EXPENSE, fromDate: addDays(monthStart, -30), branchId: jc._id },
    ]);

    // --- Run the real engines so derived fields are correct ---
    log.log('Recomputing derived state (daily + monthly pipelines)…');
    await jobs.runDaily(SYSTEM_USER); // §6.1 §6.2 fee status/overdue → §6.3 student status → §6.4 strip
    await jobs.runMonthly(SYSTEM_USER); // §6.8 recurring expenses + §6.7 salary posting

    log.log(`Seeded: ${emps.length} employees · ${batches.length} batches · ${students.length} students · ${feeDocs.length} fees · ${attDocs.length} attendance · enquiries + expenses.`);
    // eslint-disable-next-line no-console
    console.log('\n✅ Seed complete. Login: admin@livearts.local / Admin@12345\n(Sample data — replace via CSV import when available.)\n');
  } finally {
    await app.close();
  }
}

async function ensureUser(
  users: UsersService,
  email: string,
  password: string,
  name: string,
  role: UserRole,
  branchId?: string,
) {
  const existing = await users.findByEmailWithSecret(email);
  if (!existing) await users.create({ email, password, name, role, branchId });
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', e);
  process.exit(1);
});
