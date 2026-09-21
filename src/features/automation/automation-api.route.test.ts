import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";

process.env.ADMIN_PASSWORD = "test-admin-password";

const root = process.cwd();
const routeSource = readFileSync(
  path.join(root, "src/app/api/admin/automation/route.ts"),
  "utf8",
);

function requestWithCookies(cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new NextRequest("http://localhost/api/admin/automation", {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe("automation dashboard API authorization contract", () => {
  it("requires dashboard.view permission in route wiring", () => {
    assert.match(routeSource, /dashboard\.view/);
    assert.match(routeSource, /forbiddenResponse/);
    assert.match(routeSource, /unauthorizedResponse/);
    assert.doesNotMatch(routeSource, /requireAdminPermission/);
  });

  it("denies unauthenticated session for dashboard.view", () => {
    const session = getAdminSessionFromRequest(requestWithCookies({}));
    assert.equal(session.authenticated, false);
    assert.equal(can(session, "dashboard.view"), false);
  });

  it("denies authenticated admin without dashboard.view", () => {
    const identityToken = createIdentitySessionToken(
      buildUserSessionPayload({
        userId: "user-crm",
        username: "crm.user",
        employeeId: "emp-crm",
        roleId: "role-crm",
        roleCode: "CRM_ONLY",
        permissions: [["crm.view", "ALL"]],
      }),
    );
    assert.ok(identityToken);

    const session = getAdminSessionFromRequest(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: identityToken }),
    );
    assert.equal(session.authenticated, true);
    assert.equal(can(session, "dashboard.view"), false);
    assert.equal(can(session, "crm.view"), true);
  });

  it("allows authenticated admin with dashboard.view", () => {
    const identityToken = createIdentitySessionToken(
      buildUserSessionPayload({
        userId: "user-dashboard",
        username: "dashboard.viewer",
        employeeId: "emp-dashboard",
        roleId: "role-dashboard",
        roleCode: "DASHBOARD_VIEWER",
        permissions: [["dashboard.view", "ALL"]],
      }),
    );
    assert.ok(identityToken);

    const session = getAdminSessionFromRequest(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: identityToken }),
    );
    assert.equal(session.authenticated, true);
    assert.equal(can(session, "dashboard.view"), true);
  });
});
