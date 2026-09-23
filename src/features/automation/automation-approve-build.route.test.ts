import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { handleApproveBuildPost } from "@/app/api/admin/automation/issues/[issueNumber]/approve-build/route";
import type { ApproveBuildResponse } from "@/features/automation/automation-approve-build.service";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";

process.env.ADMIN_PASSWORD = "test-admin-password";

function requestWithCookies(cookies: Record<string, string>, issueNumber = "116") {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new NextRequest(
    `http://localhost/api/admin/automation/issues/${issueNumber}/approve-build`,
    {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );
}

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

describe("approve build API POST authorization contract", () => {
  beforeEach(() => {
    delete process.env.GITHUB_AUTOMATION_WRITE_TOKEN;
  });

  afterEach(() => {
    delete process.env.GITHUB_AUTOMATION_WRITE_TOKEN;
  });

  it("returns 401 for unauthenticated requests", async () => {
    const response = await handleApproveBuildPost(
      requestWithCookies({}),
      "116",
      async () => ({
        result: "approved_now",
        issueNumber: 116,
        message: "ok",
      }),
    );
    assert.equal(response.status, 401);
  });

  it("returns 403 for authenticated admin without dashboard.view", async () => {
    const token = createSessionToken([["crm.view", "ALL"]]);
    const response = await handleApproveBuildPost(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: token }),
      "116",
      async () => ({
        result: "approved_now",
        issueNumber: 116,
        message: "ok",
      }),
    );
    assert.equal(response.status, 403);
  });

  it("returns structured service result for authorized dashboard viewer", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await handleApproveBuildPost(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: token }),
      "116",
      async () => ({
        result: "already_approved",
        issueNumber: 116,
        message: "Issue đã có BUILD_APPROVED.",
      }),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as ApproveBuildResponse;
    assert.equal(body.result, "already_approved");
    assert.equal(body.issueNumber, 116);
  });

  it("does not accept arbitrary comment text through the endpoint contract", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await handleApproveBuildPost(
      new NextRequest(
        "http://localhost/api/admin/automation/issues/116/approve-build",
        {
          method: "POST",
          headers: {
            cookie: `${ADMIN_STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ comment: "MERGE NOW" }),
        },
      ),
      "116",
      async () => ({
        result: "approved_now",
        issueNumber: 116,
        message: "Đã duyệt · chờ Builder",
      }),
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as ApproveBuildResponse;
    assert.equal(body.result, "approved_now");
  });
});
