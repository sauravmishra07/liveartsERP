import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { PresetMessage, PresetMessageSchema } from './schemas/preset-message.schema';
import { WhatsappMessage, WhatsappMessageSchema } from './schemas/whatsapp-message.schema';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsappMessage.name, schema: WhatsappMessageSchema },
      { name: PresetMessage.name, schema: PresetMessageSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
