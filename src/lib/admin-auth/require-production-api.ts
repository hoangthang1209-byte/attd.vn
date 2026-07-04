import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

function unauthorizedResponse() {
  return NextResponse.json(
    { message: ADMIN_SESSION_EXPIRED_MESSAGE, error: ADMIN_SESSION_EXPIRED_MESSAGE },
    { status: 401 },
  );
}

export function requireProductionView(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session.authenticated) {
    return { session, error: unauthorizedResponse() };
  }
  if (!can(session, "production.view")) {
    return {
      session,
      error: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export function requireProductionUpdate(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session.authenticated) {
    return { session, error: unauthorizedResponse() };
  }
  if (!can(session, "production.update")) {
    return {
      session,
      error: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    };
  }
  return { session, error: null };
}
