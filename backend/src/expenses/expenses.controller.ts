import {
  Body,
  Controller,
  Delete,
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
  CreateExpenseDto,
  ExpenseQueryDto,
  GenerateRecurringDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

const EDIT_ROLES = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN];

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ExpenseQueryDto) {
    return this.expenses.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.findOne(user, id);
  }

  @Post()
  @Roles(...EDIT_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Post('generate-recurring')
  @Roles(...EDIT_ROLES)
  generateRecurring(@CurrentUser() user: AuthUser, @Body() dto: GenerateRecurringDto) {
    return this.expenses.generateRecurring(user, dto.branchId);
  }

  @Patch(':id')
  @Roles(...EDIT_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...EDIT_ROLES)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.remove(user, id);
  }
}
