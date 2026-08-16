import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { UserRole } from '../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /** Includes passwordHash (needed for login). */
  findByEmailWithSecret(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  list() {
    return this.userModel
      .find()
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel.exists({
      email: dto.email.toLowerCase().trim(),
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const branchRoles = dto.role !== UserRole.SUPER_ADMIN;
    return this.userModel.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role,
      branchId:
        branchRoles && dto.branchId ? new Types.ObjectId(dto.branchId) : null,
    });
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async setPassword(userId: string, plain: string): Promise<void> {
    const passwordHash = await bcrypt.hash(plain, 10);
    await this.userModel.updateOne({ _id: userId }, { passwordHash });
  }
}
