import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CrmService } from './crm.service';
import {
  AddActivityDto,
  AddDemoDto,
  AddFollowUpDto,
  ConvertEnquiryDto,
  CreateEnquiryDto,
  EnquiryQueryDto,
  UpdateEnquiryDto,
} from './dto/crm.dto';

const EDIT_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.STAFF];

@ApiTags('crm')
@ApiBearerAuth()
@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('enquiries')
  list(@CurrentUser() user: AuthUser, @Query() query: EnquiryQueryDto) {
    return this.crm.list(user, query);
  }

  @Get('demos')
  demos(@CurrentUser() user: AuthUser, @Query() query: EnquiryQueryDto) {
    return this.crm.listDemos(user, query);
  }

  @Get('follow-ups')
  followUps(@CurrentUser() user: AuthUser, @Query() query: EnquiryQueryDto) {
    return this.crm.listFollowUps(user, query);
  }

  @Get('enquiries/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.getOne(user, id);
  }

  @Post('enquiries')
  @Roles(...EDIT_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEnquiryDto) {
    return this.crm.create(user, dto);
  }

  @Patch('enquiries/:id')
  @Roles(...EDIT_ROLES)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEnquiryDto) {
    return this.crm.update(user, id, dto);
  }

  @Post('enquiries/:id/demos')
  @Roles(...EDIT_ROLES)
  addDemo(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddDemoDto) {
    return this.crm.addDemo(user, id, dto);
  }

  @Post('enquiries/:id/follow-ups')
  @Roles(...EDIT_ROLES)
  addFollowUp(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddFollowUpDto) {
    return this.crm.addFollowUp(user, id, dto);
  }

  @Post('enquiries/:id/activity')
  @Roles(...EDIT_ROLES)
  addActivity(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddActivityDto) {
    return this.crm.addActivity(user, id, dto);
  }

  @Post('enquiries/:id/convert')
  @Roles(...EDIT_ROLES)
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ConvertEnquiryDto) {
    return this.crm.convert(user, id, dto);
  }
}
