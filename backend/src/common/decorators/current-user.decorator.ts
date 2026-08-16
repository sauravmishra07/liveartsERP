import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../enums';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  /** null for cross-branch roles (e.g. SUPER_ADMIN). */
  branchId: string | null;
}

/** Inject the authenticated user (populated by JwtStrategy). */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | any => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
  },
);
