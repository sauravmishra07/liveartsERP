import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthUser } from '../decorators/current-user.decorator';
import { CROSS_BRANCH_ROLES } from '../enums';

/**
 * Server-side branch authorization (Requirements §8, Rule 6).
 * NEVER trust a branchId from the client for authorization.
 *
 * - Cross-branch roles (SUPER_ADMIN): may target any branch, or all (undefined).
 * - Everyone else: forced to their own branch, regardless of what they requested.
 *
 * Returns the branch filter to merge into a Mongo query
 * (`{}` means "all branches", only reachable by cross-branch roles).
 */
export function resolveBranchFilter(
  user: AuthUser,
  requestedBranchId?: string,
): Record<string, unknown> {
  if (CROSS_BRANCH_ROLES.includes(user.role)) {
    if (requestedBranchId) {
      assertObjectId(requestedBranchId);
      return { branchId: new Types.ObjectId(requestedBranchId) };
    }
    return {};
  }

  if (!user.branchId) {
    throw new ForbiddenException('User is not assigned to a branch');
  }
  // Ignore any client-supplied branchId — pin to the user's own branch.
  return { branchId: new Types.ObjectId(user.branchId) };
}

/** Throws unless `user` may act on `branchId`. */
export function assertBranchAccess(user: AuthUser, branchId: string): void {
  if (CROSS_BRANCH_ROLES.includes(user.role)) return;
  if (!user.branchId || String(user.branchId) !== String(branchId)) {
    throw new ForbiddenException('You cannot access another branch');
  }
}

/** The branch a write should be stamped with. */
export function branchForWrite(user: AuthUser, requestedBranchId?: string): Types.ObjectId {
  if (CROSS_BRANCH_ROLES.includes(user.role)) {
    const id = requestedBranchId ?? user.branchId ?? undefined;
    if (!id) throw new ForbiddenException('A branchId is required');
    assertObjectId(id);
    return new Types.ObjectId(id);
  }
  if (!user.branchId) throw new ForbiddenException('User is not assigned to a branch');
  return new Types.ObjectId(user.branchId);
}

function assertObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new ForbiddenException('Invalid branch id');
  }
}
