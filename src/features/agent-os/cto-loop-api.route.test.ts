import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { handleCtoLoopGet } from "@/app/api/admin/automation/cto-loop/route";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";

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
    }),
  );
  assert.ok(identityToken);
  return identityToken;
}

function requestForIssue(issueNumber: number, token?: string) {
  return new NextRequest(
    `http://localhost/api/admin/automation/cto-loop?issueNumber=${issueNumber}`,
    {
      method: "GET",
      headers: token
        ? { cookie: `${ADMIN_STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}` }
        : undefined,
    },
  );
}

async function loadMockService() {
  return {
    getCtoLoopVisibilityForIssue: async () => null,
  };
}

describe("cto-loop API GET authorization contract", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const response = await handleCtoLoopGet(requestForIssue(197), loadMockService);
    assert.equal(response.status, 401);
  });

  it("returns 403 without dashboard.view", async () => {
    const token = createSessionToken([["crm.view", "ALL"]]);
    const response = await handleCtoLoopGet(requestForIssue(197, token), loadMockService);
    assert.equal(response.status, 403);
  });

  it("returns 200 for dashboard viewer", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await handleCtoLoopGet(requestForIssue(197, token), loadMockService);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { issueNumber: number; visibility: null };
    assert.equal(body.issueNumber, 197);
    assert.equal(body.visibility, null);
  });
});
