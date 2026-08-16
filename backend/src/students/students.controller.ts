import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  ChangeBatchDto,
  CreateStudentDto,
  SetBreakDto,
  StudentQueryDto,
  UpdateStudentDto,
  UpdateStudentStatusDto,
} from './dto/student.dto';
import { RecomputeStatusDto } from './dto/recompute-status.dto';
import { StudentStatusService } from './student-status.service';
import { StudentsService } from './students.service';

const EDIT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.STAFF,
];
const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly statusEngine: StudentStatusService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: StudentQueryDto) {
    return this.students.list(user, query);
  }

  @Post('recompute-status')
  @Roles(...ADMIN_ROLES)
  recomputeStatus(@CurrentUser() user: AuthUser, @Body() dto: RecomputeStatusDto) {
    return this.statusEngine.recomputeAll(user, dto.branchId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.students.findOne(user, id);
  }

  @Get(':id/change-history')
  changeHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.students.changeHistory(user, id);
  }

  @Post()
  @Roles(...EDIT_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) {
    return this.students.create(user, dto);
  }

  @Patch(':id')
  @Roles(...EDIT_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(user, id, dto);
  }

  @Patch(':id/status')
  @Roles(...EDIT_ROLES)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    return this.students.updateStatus(user, id, dto);
  }

  @Patch(':id/batch')
  @Roles(...EDIT_ROLES)
  changeBatch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeBatchDto,
  ) {
    return this.students.changeBatch(user, id, dto);
  }

  @Patch(':id/break')
  @Roles(...EDIT_ROLES)
  setBreak(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetBreakDto,
  ) {
    return this.students.setBreak(user, id, dto);
  }
}
