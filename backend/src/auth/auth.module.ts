import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenStoreService } from './token-store.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Secrets are passed per-sign/verify call in AuthService (separate access/refresh secrets).
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenStoreService],
  exports: [AuthService],
})
export class AuthModule {}
