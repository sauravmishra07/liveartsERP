import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ActiveStatus,
  LatestPaymentStatus,
  StudentAttendanceStatus,
  StudentStatus,
} from '../common/enums';
import { resolveBranchFilter } from '../common/utils/branch-scope.util';
import { addDays, daysBetweenIST, startOfDayIST } from '../common/utils/date.util';
import { StudentAttendance, StudentAttendanceDocument } from '../attendance/schemas/student-attendance.schema';
import { Student, StudentDocument } from './schemas/student.schema';

/**
 * Attendance-driven student-status state machine (Requirements §6.3), a faithful
 * port of the Zoho manual_student_status_update. Manual/admin trigger (the Zoho
 * scheduled version was disabled). Transitions are audited to change-history.
 */
@Injectable()
export class StudentStatusService {
  constructor(
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(StudentAttendance.name) private readonly attModel: Model<StudentAttendanceDocument>,
    private readonly audit: AuditService,
  ) {}

  async recomputeAll(user: AuthUser, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const students = await this.studentModel
      .find({ ...branchFilter, activeStatus: ActiveStatus.ACTIVE })
      .exec();

    const today = startOfDayIST(new Date());
    const past = addDays(today, -7);
    let processed = 0;
    let changed = 0;
    for (const s of students) {
      if (await this.recomputeOne(user, s, today, past)) changed++;
      processed++;
    }
    return { processed, changed };
  }

  private async recomputeOne(
    user: AuthUser,
    s: StudentDocument,
    today: Date,
    past: Date,
  ): Promise<boolean> {
    const atts = await this.attModel
      .find({ studentId: s._id, date: { $gte: past } })
      .sort({ date: -1 })
      .lean()
      .exec();
    const first = atts[0] || null; // latest
    const second = atts[1] || null; // 2nd latest

    const joining = s.joiningDate ? startOfDayIST(new Date(s.joiningDate)) : null;
    const actualJoining = s.actualJoiningDate ? startOfDayIST(new Date(s.actualJoiningDate)) : null;
    const days = joining ? daysBetweenIST(joining, today) : 9999; // computed once (Zoho parity)
    const unpaid = s.latestPaymentStatus === LatestPaymentStatus.UNPAID;

    const oldStatus = s.studentStatus;
    let status: string = s.studentStatus;
    const has = (v: string) => String(status || '').includes(v);
    const P = StudentAttendanceStatus.PRESENT;
    const A = StudentAttendanceStatus.ABSENT;

    // 1) Absent-Absent, and present-after-absent
    if (!has('Demo') && !has('On Break')) {
      if (first && second && first.status === A && second.status === A) status = StudentStatus.ABSENT;
      if (first && first.status === P && String(status).includes('Absent') && joining && actualJoining) {
        if (days <= 30 && actualJoining.getTime() !== joining.getTime()) status = StudentStatus.REJOINED;
        else if (days <= 30 && actualJoining.getTime() === joining.getTime() && !unpaid) status = StudentStatus.NEW;
        else if (days <= 30 && actualJoining.getTime() === joining.getTime() && unpaid) status = StudentStatus.DEMO;
        else status = StudentStatus.REGULAR;
      }
    }

    // 2) On Break → Rejoined (resets joining date; audited)
    if (String(status).includes('On Break') && first && first.status === P) {
      status = StudentStatus.REJOINED;
      s.joiningDate = new Date(first.date);
    }

    // 3) New / Regular
    if (s.joiningDate) {
      if (!String(status).includes('Absent') && !String(status).includes('On Break') && !String(status).includes('Leaving This Month')) {
        if (days <= 30 && !String(status).includes('Rejoined') && !unpaid) status = StudentStatus.NEW;
        if (days > 30) status = StudentStatus.REGULAR;
      }
    }

    if (status !== oldStatus) {
      s.studentStatus = status as StudentStatus;
      await s.save();
      await this.audit.record({
        studentId: s._id,
        fieldChanged: 'studentStatus',
        oldValue: oldStatus,
        newValue: status,
        changedBy: user.id,
        branchId: s.branchId,
      });
      return true;
    }
    return false;
  }
}
