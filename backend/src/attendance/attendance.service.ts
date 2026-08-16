import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ActiveStatus, BatchStatus, StudentAttendanceStatus } from '../common/enums';
import { addDays, startOfDayIST, weekdayIST } from '../common/utils/date.util';
import {
  assertBranchAccess,
  resolveBranchFilter,
} from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import { Batch, BatchDocument } from '../batches/schemas/batch.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import {
  AttendanceQueryDto,
  MarkAttendanceDto,
  MarkBatchAttendanceDto,
} from './dto/attendance.dto';
import {
  StudentAttendance,
  StudentAttendanceDocument,
} from './schemas/student-attendance.schema';

// today, yesterday, then N-days-ago (index i => today minus i days) — matches Requirements §6.4.
const STRIP_KEYS = ['today', 'yesterday', 'days3ago', 'days4ago', 'days5ago', 'days6ago', 'days7ago'];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(StudentAttendance.name) private readonly model: Model<StudentAttendanceDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Batch.name) private readonly batchModel: Model<BatchDocument>,
  ) {}

  private dayKey(dateStr: string): Date {
    return startOfDayIST(new Date(dateStr));
  }

  /** Mark (or correct) one student's attendance for a day. Idempotent per (student, day). */
  async mark(user: AuthUser, dto: MarkAttendanceDto) {
    const student = await this.studentModel.findById(dto.studentId).exec();
    if (!student) throw new NotFoundException('Student not found');
    assertBranchAccess(user, String(student.branchId));

    const date = this.dayKey(dto.date);
    const batchId = dto.batchId ? new Types.ObjectId(dto.batchId) : student.batchId;
    return this.model
      .findOneAndUpdate(
        { studentId: student._id, date },
        { $set: { status: dto.status, batchId, branchId: student.branchId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /** Mark a whole batch in one shot (bulk upsert). */
  async markBatch(user: AuthUser, batchId: string, dto: MarkBatchAttendanceDto) {
    const batch = await this.batchModel.findById(batchId).exec();
    if (!batch) throw new NotFoundException('Batch not found');
    assertBranchAccess(user, String(batch.branchId));

    const date = this.dayKey(dto.date);
    const ops = dto.records.map((r) => ({
      updateOne: {
        filter: { studentId: new Types.ObjectId(r.studentId), date },
        update: { $set: { status: r.status, batchId: batch._id, branchId: batch.branchId } },
        upsert: true,
      },
    }));
    if (ops.length) await this.model.bulkWrite(ops);
    return { marked: ops.length, date };
  }

  list(user: AuthUser, q: AttendanceQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.studentId) filter.studentId = new Types.ObjectId(q.studentId);
    if (q.batchId) filter.batchId = new Types.ObjectId(q.batchId);
    if (q.status) filter.status = q.status;
    if (q.dateFrom || q.dateTo) {
      filter.date = {};
      if (q.dateFrom) filter.date.$gte = this.dayKey(q.dateFrom);
      if (q.dateTo) filter.date.$lte = this.dayKey(q.dateTo);
    }
    return paginate(this.model, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'date',
      sortOrder: q.sortOrder,
      populate: [
        { path: 'studentId', select: 'name phoneNumber' },
        { path: 'batchId', select: 'batchName' },
      ],
    });
  }

  /** Roster for a batch on a date: active students + each one's status that day (for the marking grid). */
  async batchRoster(user: AuthUser, batchId: string, dateStr?: string) {
    const batch = await this.batchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Batch not found');
    assertBranchAccess(user, String(batch.branchId));

    const date = this.dayKey(dateStr || new Date().toISOString());
    const students = await this.studentModel
      .find({ batchId: batch._id, activeStatus: ActiveStatus.ACTIVE })
      .select('name phoneNumber studentStatus')
      .sort({ 'name.first': 1 })
      .lean()
      .exec();
    const records = await this.model
      .find({ batchId: batch._id, date })
      .select('studentId status')
      .lean()
      .exec();
    const statusById = new Map(records.map((r) => [String(r.studentId), r.status]));

    return {
      batch: { _id: batch._id, batchName: batch.batchName, timings: batch.timings, days: batch.days },
      date,
      students: students.map((s) => ({ ...s, status: statusById.get(String(s._id)) ?? null })),
    };
  }

  /**
   * Per-batch attendance rollup for a date range — powers the Attendance "By batch" view.
   * `sessions` counts distinct days actually marked, so a batch that only meets twice a
   * week isn't judged against every calendar day in the range.
   */
  async batchSummary(user: AuthUser, from?: string, to?: string, branchId?: string) {
    const bf = resolveBranchFilter(user, branchId);
    const end = to ? this.dayKey(to) : startOfDayIST(new Date());
    const start = from ? this.dayKey(from) : addDays(end, -29);

    const batches = await this.batchModel
      .find({ ...bf, status: BatchStatus.ACTIVE })
      .populate('teacherId', 'name')
      .populate('branchId', 'name')
      .lean();

    const rows = await this.model.aggregate([
      { $match: { ...bf, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { batchId: '$batchId', status: '$status' },
          total: { $sum: 1 },
          days: { $addToSet: '$date' },
        },
      },
    ]);

    const activeCounts = await this.studentModel.aggregate([
      { $match: { ...bf, activeStatus: ActiveStatus.ACTIVE, batchId: { $ne: null } } },
      { $group: { _id: '$batchId', total: { $sum: 1 } } },
    ]);

    return batches
      .map((b) => {
        const id = String(b._id);
        const pick = (status: string) => rows.find((r) => String(r._id.batchId) === id && r._id.status === status);
        const p = pick(StudentAttendanceStatus.PRESENT);
        const a = pick(StudentAttendanceStatus.ABSENT);
        const present = p?.total ?? 0;
        const absent = a?.total ?? 0;
        const marked = present + absent;
        const sessions = new Set([...(p?.days ?? []), ...(a?.days ?? [])].map((d) => new Date(d).getTime())).size;
        return {
          batchId: b._id,
          batchName: b.batchName,
          activity: b.activity,
          days: b.days ?? [],
          timings: b.timings ?? '',
          teacher: (b as any).teacherId?.name ?? null,
          branch: (b as any).branchId?.name ?? null,
          activeStudents: activeCounts.find((c) => String(c._id) === id)?.total ?? 0,
          present,
          absent,
          marked,
          sessions,
          rate: marked ? Math.round((present / marked) * 100) : null,
        };
      })
      .sort((x, y) => (y.rate ?? -1) - (x.rate ?? -1));
  }

  async studentHistory(user: AuthUser, studentId: string, limit = 60) {
    const student = await this.studentModel.findById(studentId).select('branchId').lean().exec();
    if (!student) throw new NotFoundException('Student not found');
    assertBranchAccess(user, String(student.branchId));
    return this.model
      .find({ studentId: new Types.ObjectId(studentId) })
      .sort({ date: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Recompute each active student's rolling 7-day strip (Requirements §6.4).
   * Manual/admin only (the Zoho scheduled version was disabled). Branch-parameterized.
   * Marker: P present · A absent · ! scheduled class unmarked · '' no class / pre-joining.
   */
  async recomputeStrip(user: AuthUser, branchId?: string) {
    const branchFilter = resolveBranchFilter(user, branchId);
    const students = await this.studentModel
      .find({ ...branchFilter, activeStatus: ActiveStatus.ACTIVE })
      .exec();

    const today = startOfDayIST(new Date());
    const from = addDays(today, -6);
    let updated = 0;

    for (const s of students) {
      const batch = s.batchId ? await this.batchModel.findById(s.batchId).lean().exec() : null;
      const activeDays: string[] = (batch?.days as string[]) || [];

      const recs = await this.model
        .find({ studentId: s._id, date: { $gte: from, $lte: today } })
        .select('date status')
        .lean()
        .exec();
      const byDate = new Map(recs.map((r) => [startOfDayIST(new Date(r.date)).getTime(), r.status]));
      const joining = s.joiningDate ? startOfDayIST(new Date(s.joiningDate)) : null;

      for (let i = 0; i < 7; i++) {
        const d = addDays(today, -i);
        let mark = '';
        if (joining && d.getTime() < joining.getTime()) {
          mark = '';
        } else {
          const st = byDate.get(d.getTime());
          if (st === StudentAttendanceStatus.PRESENT) mark = 'P';
          else if (st === StudentAttendanceStatus.ABSENT) mark = 'A';
          else mark = activeDays.includes(weekdayIST(d)) ? '!' : '';
        }
        (s as any)[STRIP_KEYS[i]] = mark;
      }
      await s.save();
      updated++;
    }
    return { updated };
  }
}
