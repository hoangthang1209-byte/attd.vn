import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { ADMIN_SESSION_COOKIE, ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth/resolve-admin-session-auth";
import { createAdminSessionToken } from "@/lib/admin-auth/session-node";
import {
  buildOwnerSessionPayload,
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";

process.env.ADMIN_PASSWORD = "test-admin-password";

function requestWithCookies(cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new NextRequest("http://localhost/api/patterns/pattern-1", {
    method: "PATCH",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe("isAdminRequestAuthenticated", () => {
  it("requires either owner gate or staff payload", () => {
    assert.equal(isAdminRequestAuthenticated({ ownerGateValid: false, staffPayload: null }), false);
    assert.equal(isAdminRequestAuthenticated({ ownerGateValid: true, staffPayload: null }), true);
    assert.equal(
      isAdminRequestAuthenticated({ ownerGateValid: false, staffPayload: { mode: "owner" } }),
      true,
    );
  });
});

describe("getAdminSessionFromRequest production auth", () => {
  it("returns anonymous session without cookies", () => {
    const session = getAdminSessionFromRequest(requestWithCookies({}));
    assert.equal(session.authenticated, false);
  });

  it("accepts owner gate cookie alone", () => {
    const ownerToken = createAdminSessionToken();
    assert.ok(ownerToken);
    const session = getAdminSessionFromRequest(
      requestWithCookies({ [ADMIN_SESSION_COOKIE]: ownerToken }),
    );
    assert.equal(session.authenticated, true);
    assert.equal(session.mode, "owner");
    assert.equal(can(session, "production.update"), true);
  });

  it("accepts signed staff identity cookie without owner gate cookie", () => {
    const identityToken = createIdentitySessionToken(
      buildUserSessionPayload({
        userId: "user-1",
        username: "production.manager",
        employeeId: "emp-1",
        roleId: "role-1",
        roleCode: "PRODUCTION_MANAGER",
        permissions: [["production.update", "ALL"]],
      }),
    );
    assert.ok(identityToken);

    const session = getAdminSessionFromRequest(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: identityToken }),
    );
    assert.equal(session.authenticated, true);
    assert.equal(can(session, "production.update"), true);
  });

  it("returns 401 when unauthenticated", async () => {
    const auth = requireProductionUpdate(requestWithCookies({}));
    assert.ok(auth.error);
    assert.equal(auth.error.status, 401);
    const body = (await auth.error.json()) as { message?: string };
    assert.match(body.message ?? "", /Phiên đăng nhập đã hết hạn/);
  });

  it("returns 403 for authenticated staff without production.update", async () => {
    const ownerToken = createAdminSessionToken();
    const identityToken = createIdentitySessionToken(
      buildUserSessionPayload({
        userId: "user-2",
        username: "viewer",
        employeeId: null,
        roleId: "role-2",
        roleCode: "VIEWER",
        permissions: [["production.view", "ALL"]],
      }),
    );
    assert.ok(ownerToken);
    assert.ok(identityToken);

    const auth = requireProductionUpdate(
      requestWithCookies({
        [ADMIN_SESSION_COOKIE]: ownerToken,
        [ADMIN_STAFF_SESSION_COOKIE]: identityToken,
      }),
    );
    assert.ok(auth.error);
    assert.equal(auth.error.status, 403);
  });

  it("allows owner fallback session to update production resources", () => {
    const ownerToken = createAdminSessionToken();
    const identityToken = createIdentitySessionToken(buildOwnerSessionPayload());
    assert.ok(ownerToken);
    assert.ok(identityToken);

    const auth = requireProductionUpdate(
      requestWithCookies({
        [ADMIN_SESSION_COOKIE]: ownerToken,
        [ADMIN_STAFF_SESSION_COOKIE]: identityToken,
      }),
    );
    assert.equal(auth.error, null);
    assert.equal(can(auth.session, "production.update"), true);
  });
});
