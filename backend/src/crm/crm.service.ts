import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ActiveStatus, EnquiryStatus, StudentStatus } from '../common/enums';
import { assertBranchAccess, branchForWrite, resolveBranchFilter } from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import { StudentsService } from '../students/students.service';
import {
  AddActivityDto,
  AddDemoDto,
  AddFollowUpDto,
  ConvertEnquiryDto,
  CreateEnquiryDto,
  EnquiryQueryDto,
  UpdateEnquiryDto,
} from './dto/crm.dto';
import { Demo, DemoDocument } from './schemas/demo.schema';
import { EnquiryActivity, EnquiryActivityDocument } from './schemas/enquiry-activity.schema';
import { Enquiry, EnquiryDocument } from './schemas/enquiry.schema';
import { FollowUp, FollowUpDocument } from './schemas/follow-up.schema';

@Injectable()
export class CrmService {
  constructor(
    @InjectModel(Enquiry.name) private readonly enquiryModel: Model<EnquiryDocument>,
    @InjectModel(Demo.name) private readonly demoModel: Model<DemoDocument>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUpDocument>,
    @InjectModel(EnquiryActivity.name) private readonly activityModel: Model<EnquiryActivityDocument>,
    private readonly students: StudentsService,
  ) {}

  private async owned(user: AuthUser, id: string): Promise<EnquiryDocument> {
    const e = await this.enquiryModel.findById(id).exec();
    if (!e) throw new NotFoundException('Enquiry not found');
    assertBranchAccess(user, String(e.branchId));
    return e;
  }

  private log(enquiry: EnquiryDocument, action: string, user: AuthUser, notes?: string) {
    return this.activityModel.create({
      enquiryId: enquiry._id,
      action,
      notes,
      createdBy: new Types.ObjectId(user.id),
      branchId: enquiry.branchId,
    });
  }

  async create(user: AuthUser, dto: CreateEnquiryDto) {
    const branchId = branchForWrite(user, dto.branchId);
    const doc: Record<string, any> = { ...dto, branchId };
    if (dto.nextFollowUpDate) doc.nextFollowUpDate = new Date(dto.nextFollowUpDate);
    delete doc.branchId;
    const enquiry = await this.enquiryModel.create({ ...doc, branchId });
    await this.log(enquiry, 'Enquiry created', user);
    return enquiry;
  }

  async update(user: AuthUser, id: string, dto: UpdateEnquiryDto) {
    const e = await this.owned(user, id);
    const oldStatus = e.status;
    const patch: Record<string, any> = { ...dto };
    delete patch.branchId;
    if (dto.nextFollowUpDate) patch.nextFollowUpDate = new Date(dto.nextFollowUpDate);
    Object.assign(e, patch);
    await e.save();
    if (dto.status && dto.status !== oldStatus) {
      await this.log(e, `Status: ${oldStatus} → ${dto.status}`, user);
    }
    return e;
  }

  list(user: AuthUser, q: EnquiryQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, q.branchId);
    if (q.status) filter.status = q.status;
    if (q.search) {
      const rx = { $regex: q.search, $options: 'i' };
      filter.$or = [{ 'name.first': rx }, { 'name.last': rx }, { phone: rx }];
    }
    return paginate(this.enquiryModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      populate: [{ path: 'branchId', select: 'name' }],
    });
  }

  async getOne(user: AuthUser, id: string) {
    const enquiry = await this.owned(user, id);
    const [demos, followUps, activities] = await Promise.all([
      this.demoModel.find({ enquiryId: enquiry._id }).sort({ date: -1 }).lean().exec(),
      this.followUpModel.find({ enquiryId: enquiry._id }).sort({ createdAt: -1 }).lean().exec(),
      this.activityModel.find({ enquiryId: enquiry._id }).sort({ date: -1 }).populate('createdBy', 'name').lean().exec(),
    ]);
    return { enquiry, demos, followUps, activities };
  }

  async addDemo(user: AuthUser, id: string, dto: AddDemoDto) {
    const e = await this.owned(user, id);
    const demo = await this.demoModel.create({
      enquiryId: e._id,
      date: new Date(dto.date),
      time: dto.time,
      status: dto.status,
      batchId: dto.batchId ? new Types.ObjectId(dto.batchId) : undefined,
      remarks: dto.remarks,
      branchId: e.branchId,
    });
    if (e.status === EnquiryStatus.NEW || e.status === EnquiryStatus.FOLLOW_UP) {
      e.status = EnquiryStatus.DEMO_SCHEDULED;
      await e.save();
    }
    await this.log(e, `Demo scheduled for ${dto.date}`, user, dto.remarks);
    return demo;
  }

  async addFollowUp(user: AuthUser, id: string, dto: AddFollowUpDto) {
    const e = await this.owned(user, id);
    const fu = await this.followUpModel.create({
      enquiryId: e._id,
      type: dto.type,
      date: dto.date ? new Date(dto.date) : new Date(),
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
      remarks: dto.remarks,
      branchId: e.branchId,
    });
    if (dto.nextFollowUpDate) e.nextFollowUpDate = new Date(dto.nextFollowUpDate);
    if (e.status === EnquiryStatus.NEW) e.status = EnquiryStatus.FOLLOW_UP;
    await e.save();
    await this.log(e, `Follow-up: ${dto.type || 'logged'}`, user, dto.remarks);
    return fu;
  }

  async addActivity(user: AuthUser, id: string, dto: AddActivityDto) {
    const e = await this.owned(user, id);
    return this.log(e, dto.action, user, dto.notes);
  }

  /** Convert an enquiry into a student, preserving all CRM history (Requirements §24). */
  async convert(user: AuthUser, id: string, dto: ConvertEnquiryDto) {
    const e = await this.owned(user, id);
    if (e.convertedStudentId) throw new BadRequestException('Enquiry already converted');

    const student = await this.students.create(user, {
      name: e.name as any,
      phoneNumber: e.phone,
      branchId: String(e.branchId),
      batchId: dto.batchId,
      joiningDate: dto.joiningDate,
      activeStatus: ActiveStatus.ACTIVE,
      studentStatus: StudentStatus.NEW,
      preferredFeePackage: dto.preferredFeePackage,
      monthlyFee: dto.monthlyFee,
    } as any);

    e.status = EnquiryStatus.CONVERTED;
    e.convertedStudentId = student._id as Types.ObjectId;
    await e.save();
    await this.log(e, 'Converted to student', user, `Student ID ${student._id}`);
    return { enquiry: e, studentId: student._id };
  }

  // --- report lists ---
  listDemos(user: AuthUser, q: EnquiryQueryDto) {
    const filter = resolveBranchFilter(user, q.branchId);
    return paginate(this.demoModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'date',
      sortOrder: q.sortOrder,
      populate: [{ path: 'enquiryId', select: 'name phone' }],
    });
  }

  listFollowUps(user: AuthUser, q: EnquiryQueryDto) {
    const filter = resolveBranchFilter(user, q.branchId);
    return paginate(this.followUpModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'createdAt',
      sortOrder: q.sortOrder,
      populate: [{ path: 'enquiryId', select: 'name phone' }],
    });
  }
}
