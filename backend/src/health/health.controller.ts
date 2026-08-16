import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';
import { RedisService } from '../common/redis/redis.service';

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + dependency status' })
  check() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      mongo: MONGO_STATES[this.mongo.readyState] ?? 'unknown',
      redis: this.redis.isReady() ? 'connected' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
