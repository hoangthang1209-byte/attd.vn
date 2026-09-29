import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";
import {
  crmOwnerValidationDeps,
  resetCrmOwnerValidationDeps,
} from "@/features/crm/services/crm-owner-validation.deps";
import { PATCH } from "@/app/api/crm/leads/[id]/route";

process.env.ADMIN_PASSWORD = "test-admin-password";

function createSessionToken(permissions: SessionPermissionGrant[]) {
  const identityToken = createIdentitySessionToken(
    buildUserSessionPayload({
      userId: "user-test",
      username: "test.user",
      employeeId: "emp-test",
      roleId: "role-test",
      roleCode: "TEST_ROLE",
      permissions,
    })
  );
  assert.ok(identityToken);
  return identityToken;
}

function patchRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new NextRequest("http://localhost/api/crm/leads/lead-1", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/crm/leads/[id] owner validation", () => {
  beforeEach(() => {
    resetCrmOwnerValidationDeps();
  });

  afterEach(() => {
    resetCrmOwnerValidationDeps();
  });

  it("returns 400 when explicit assignedTo fails sales-capable validation", async () => {
    crmOwnerValidationDeps.getEmployeeById = async () => null;

    const token = createSessionToken([["crm.update", "ALL"]]);
    const response = await PATCH(
      patchRequest({ assignedTo: "invalid-owner" }, { [ADMIN_STAFF_SESSION_COOKIE]: token }),
      { params: Promise.resolve({ id: "lead-1" }) }
    );

    assert.equal(response.status, 400);
    const body = (await response.json()) as { message?: string };
    assert.match(body.message ?? "", /Sales owner không hợp lệ/);
  });
});
