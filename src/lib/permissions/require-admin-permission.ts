import type { NextRequest, NextResponse } from "next/server";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { isOwnerLikeSession } from "@/features/auth/admin-permissions";
import {
  getAdminSessionFromCookies,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth/get-admin-session";
import { unauthorizedResponse } from "@/lib/errors/permission-errors";
import type { AdminPlatformKey, PermissionAction } from "@/lib/permissions/permission-registry";

export type RequireAdminPermissionInput = {
  platform: AdminPlatformKey;
  action: PermissionAction;
  request?: Request;
  allowSuperAdmin?: boolean;
};

export type RequireAdminPermissionResult =
  | {
      ok: true;
      session: AdminSessionUser;
      user: AdminSessionUser;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function isNextRequest(request: Request): request is NextRequest {
  return "cookies" in request;
}

export async function requireAdminPermission(
  input: RequireAdminPermissionInput,
): Promise<RequireAdminPermissionResult> {
  const session =
    input.request && isNextRequest(input.request)
      ? getAdminSessionFromRequest(input.request)
      : await getAdminSessionFromCookies();

  if (!session.authenticated) {
    return { ok: false, response: unauthorizedResponse() };
  }

  if (input.allowSuperAdmin !== false && isOwnerLikeSession(session)) {
    return { ok: true, session, user: session };
  }

  // TODO(CTO-5): Map platform/action pairs to concrete AdminPermission codes
  // and enforce scopes after pilot route tests cover middleware bypass.
  void input.platform;
  void input.action;

  return { ok: true, session, user: session };
}
