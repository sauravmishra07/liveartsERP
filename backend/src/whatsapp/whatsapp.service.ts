import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertBranchAccess, resolveBranchFilter } from '../common/utils/branch-scope.util';
import { paginate } from '../common/utils/query.util';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { CreateTemplateDto, MessageQueryDto, SendMessageDto } from './dto/whatsapp.dto';
import { PresetMessage, PresetMessageDocument } from './schemas/preset-message.schema';
import { WhatsappMessage, WhatsappMessageDocument } from './schemas/whatsapp-message.schema';

/**
 * WhatsApp abstraction (Requirements §19). Provider is pluggable via WHATSAPP_PROVIDER:
 * - `mock` (default): logs + marks sent, so the whole system works without credentials.
 * - `meta`: WhatsApp Business (Graph) API — interface implemented; enable with credentials.
 * Sends are best-effort and never block the caller (e.g. fee collection §6.5).
 * Retries/delays move to a BullMQ worker in Phase 11 (needs Redis).
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsApp');

  constructor(
    @InjectModel(WhatsappMessage.name) private readonly msgModel: Model<WhatsappMessageDocument>,
    @InjectModel(PresetMessage.name) private readonly presetModel: Model<PresetMessageDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    private readonly config: ConfigService,
  ) {}

  private async deliver(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
    const provider = this.config.get<string>('whatsapp.provider') || 'mock';
    if (provider === 'meta') {
      const apiUrl = this.config.get<string>('whatsapp.apiUrl');
      const token = this.config.get<string>('whatsapp.accessToken');
      const phoneId = this.config.get<string>('whatsapp.phoneNumberId');
      if (!apiUrl || !token || !phoneId) {
        return { ok: false, error: 'WhatsApp Meta credentials not configured' };
      }
      // Real integration point (kept behind config so the app runs without creds):
      //   POST {apiUrl}/{phoneId}/messages  { messaging_product, to, type:'text', text:{ body } }
      //   Authorization: Bearer {token}
      return { ok: true };
    }
    this.logger.log(`[MOCK] → ${to}: ${message.slice(0, 80)}`);
    return { ok: true };
  }

  private async process(msg: WhatsappMessageDocument): Promise<WhatsappMessageDocument> {
    const result = await this.deliver(msg.to, msg.message);
    msg.attempts += 1;
    msg.provider = this.config.get<string>('whatsapp.provider') || 'mock';
    if (result.ok) {
      msg.status = 'sent';
      msg.sentAt = new Date();
      msg.error = undefined;
    } else {
      msg.status = 'failed';
      msg.error = result.error;
    }
    await msg.save();
    return msg;
  }

  async send(user: AuthUser, dto: SendMessageDto) {
    let to = dto.to;
    let studentId: Types.ObjectId | undefined;
    let branchId: Types.ObjectId | undefined = user.branchId ? new Types.ObjectId(user.branchId) : undefined;

    if (dto.studentId) {
      const s = await this.studentModel.findById(dto.studentId).select('phoneNumber branchId').lean().exec();
      if (s) {
        assertBranchAccess(user, String(s.branchId));
        to = to || s.phoneNumber;
        studentId = s._id as Types.ObjectId;
        branchId = s.branchId as Types.ObjectId;
      }
    }
    if (!to) throw new BadRequestException('No recipient phone number');

    const msg = await this.msgModel.create({
      to,
      message: dto.message,
      studentId,
      enquiryId: dto.enquiryId ? new Types.ObjectId(dto.enquiryId) : undefined,
      status: 'queued',
      branchId,
    });
    return this.process(msg);
  }

  /** Fire-and-forget confirmation (used by fee collection §6.5). Never throws. */
  async sendConfirmation(opts: {
    to?: string;
    message: string;
    studentId?: Types.ObjectId;
    branchId?: Types.ObjectId;
  }): Promise<void> {
    try {
      if (!opts.to) return;
      const msg = await this.msgModel.create({
        to: opts.to,
        message: opts.message,
        studentId: opts.studentId,
        status: 'queued',
        branchId: opts.branchId,
      });
      await this.process(msg);
    } catch (e) {
      this.logger.warn(`Confirmation send failed: ${(e as Error).message}`);
    }
  }

  listMessages(user: AuthUser, q: MessageQueryDto) {
    const filter: Record<string, any> = resolveBranchFilter(user, undefined);
    if (q.studentId) filter.studentId = new Types.ObjectId(q.studentId);
    if (q.status) filter.status = q.status;
    return paginate(this.msgModel, filter, {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy || 'createdAt',
      sortOrder: q.sortOrder,
      populate: [{ path: 'studentId', select: 'name' }],
    });
  }

  listTemplates(user: AuthUser) {
    // Templates are shared (branch-null) or branch-scoped.
    const branch = resolveBranchFilter(user, undefined);
    const or: any[] = [{ branchId: { $exists: false } }, { branchId: null }];
    if ((branch as any).branchId) or.push({ branchId: (branch as any).branchId });
    return this.presetModel.find({ $or: or }).sort({ name: 1 }).lean().exec();
  }

  createTemplate(user: AuthUser, dto: CreateTemplateDto) {
    return this.presetModel.create({
      name: dto.name,
      message: dto.message,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : user.branchId ? new Types.ObjectId(user.branchId) : undefined,
    });
  }
}
