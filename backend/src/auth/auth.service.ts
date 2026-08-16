import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/auth.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';
import { TokenStoreService } from './token-store.service';

interface RefreshPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithSecret(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.users.verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const valid = await this.tokenStore.isValid(payload.sub, payload.jti);
    if (!valid) throw new UnauthorizedException('Refresh token revoked or expired');

    // Rotation: invalidate the old token, issue a fresh pair.
    await this.tokenStore.revoke(payload.sub, payload.jti);

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
          secret: this.config.get<string>('jwt.refreshSecret'),
        });
        await this.tokenStore.revoke(payload.sub, payload.jti);
        return { loggedOut: true };
      } catch {
        /* fall through to revoke-all */
      }
    }
    await this.tokenStore.revokeAll(userId);
    return { loggedOut: true };
  }

  /** Verifies the current password before setting a new one, then forces re-login everywhere. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const withSecret = await this.users.findByEmailWithSecret(user.email);
    const ok =
      withSecret && (await this.users.verifyPassword(currentPassword, withSecret.passwordHash));
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await this.users.setPassword(userId, newPassword);
    await this.tokenStore.revokeAll(userId); // existing sessions must re-authenticate
    this.logger.log(`Password changed for ${user.email}`);
    return { changed: true };
  }

  private async issueTokens(user: UserDocument) {
    const branchId = user.branchId ? String(user.branchId) : null;
    const accessPayload: AccessTokenPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      branchId,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      // string form (e.g. "15m") — cast past @nestjs/jwt's `ms` literal type.
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') as unknown as number,
    });

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: String(user._id), jti },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as unknown as number,
      },
    );

    const ttl = this.refreshTtlSeconds(refreshToken);
    await this.tokenStore.save(String(user._id), jti, ttl);

    return {
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        branchId,
      },
    };
  }

  private refreshTtlSeconds(token: string): number {
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
    }
    return 7 * 24 * 60 * 60;
  }
}
