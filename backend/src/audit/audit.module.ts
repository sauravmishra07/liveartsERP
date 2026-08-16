import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import {
  ChangeHistory,
  ChangeHistorySchema,
} from './schemas/change-history.schema';

// Global so any module can inject AuditService without re-importing.
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChangeHistory.name, schema: ChangeHistorySchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService, MongooseModule],
})
export class AuditModule {}
