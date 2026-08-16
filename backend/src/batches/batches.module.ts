import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { Batch, BatchSchema } from './schemas/batch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Batch.name, schema: BatchSchema }]),
  ],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService, MongooseModule],
})
export class BatchesModule {}
