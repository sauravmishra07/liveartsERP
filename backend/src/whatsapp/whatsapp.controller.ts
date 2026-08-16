import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CreateTemplateDto, MessageQueryDto, SendMessageDto } from './dto/whatsapp.dto';
import { WhatsAppService } from './whatsapp.service';

const SEND_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.STAFF];

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('messages')
  messages(@CurrentUser() user: AuthUser, @Query() query: MessageQueryDto) {
    return this.whatsapp.listMessages(user, query);
  }

  @Get('templates')
  templates(@CurrentUser() user: AuthUser) {
    return this.whatsapp.listTemplates(user);
  }

  @Post('send')
  @Roles(...SEND_ROLES)
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.whatsapp.send(user, dto);
  }

  @Post('templates')
  @Roles(...SEND_ROLES)
  createTemplate(@CurrentUser() user: AuthUser, @Body() dto: CreateTemplateDto) {
    return this.whatsapp.createTemplate(user, dto);
  }
}
