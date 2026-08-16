import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsModule } from '../students/students.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { Demo, DemoSchema } from './schemas/demo.schema';
import { EnquiryActivity, EnquiryActivitySchema } from './schemas/enquiry-activity.schema';
import { Enquiry, EnquirySchema } from './schemas/enquiry.schema';
import { FollowUp, FollowUpSchema } from './schemas/follow-up.schema';

@Module({
  imports: [
    StudentsModule, // for StudentsService (convert)
    MongooseModule.forFeature([
      { name: Enquiry.name, schema: EnquirySchema },
      { name: Demo.name, schema: DemoSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: EnquiryActivity.name, schema: EnquiryActivitySchema },
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
