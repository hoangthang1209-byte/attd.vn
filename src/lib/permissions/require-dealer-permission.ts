import type { NextRequest, NextResponse } from "next/server";
import {
  getB2BPortalSessionPayloadFromRequest,
} from "@/features/dealer/auth/dealer-session";
import {
  requireApprovedDealerPortal,
  requireApprovedDealerPortalFromCookies,
} from "@/lib/dealer-auth/require-dealer-portal";
import type { ApprovedDealerPortalSession } from "@/lib/dealer-auth/require-dealer-portal";
import {
  dealerForbiddenResponse,
  dealerUnauthorizedResponse,
} from "@/lib/errors/permission-errors";
import type { PermissionAction } from "@/lib/permissions/permission-registry";

export type RequireDealerPermissionInput = {
  action: PermissionAction;
  dealerCompanyId?: string;
  request?: Request;
};

export type RequireDealerPermissionResult =
  | {
      ok: true;
      context: ApprovedDealerPortalSession;
      session: ApprovedDealerPortalSession;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function isNextRequest(request: Request): request is NextRequest {
  return "cookies" in request;
}

export async function requireDealerPermission(
  input: RequireDealerPermissionInput,
): Promise<RequireDealerPermissionResult> {
  if (!input.request) {
    const auth = await requireApprovedDealerPortalFromCookies();
    if ("error" in auth) {
      return {
        ok: false,
        response: auth.error.status === 403 ? dealerForbiddenResponse() : dealerUnauthorizedResponse(),
      };
    }
    if (input.dealerCompanyId && input.dealerCompanyId !== auth.session.companyId) {
      return { ok: false, response: dealerForbiddenResponse() };
    }
    return { ok: true, context: auth.session, session: auth.session };
  }

  const payload =
    isNextRequest(input.request)
      ? getB2BPortalSessionPayloadFromRequest(input.request)
      : null;

  if (!payload) {
    return { ok: false, response: dealerUnauthorizedResponse() };
  }

  if (input.dealerCompanyId && input.dealerCompanyId !== payload.dealerCompanyId) {
    return { ok: false, response: dealerForbiddenResponse() };
  }

  const auth = await requireApprovedDealerPortal(payload.dealerCompanyId, payload.dealerUserId);
  if ("error" in auth) {
    return {
      ok: false,
      response: auth.error.status === 403 ? dealerForbiddenResponse() : dealerUnauthorizedResponse(),
    };
  }

  // TODO(CTO-5): Map dealer role/action permissions once the dealer matrix is
  // enforced route-by-route. CTO-4 only establishes session and ownership guards.
  void input.action;

  return { ok: true, context: auth.session, session: auth.session };
}
