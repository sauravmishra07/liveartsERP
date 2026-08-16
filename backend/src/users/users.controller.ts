import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list() {
    return this.users.list();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateUserDto) {
    const u = await this.users.create(dto);
    // Never return the password hash.
    return {
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      branchId: u.branchId ? String(u.branchId) : null,
    };
  }
}
