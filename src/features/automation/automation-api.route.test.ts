import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/automation/route";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";

process.env.ADMIN_PASSWORD = "test-admin-password";

function requestWithCookies(cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  return new NextRequest("http://localhost/api/admin/automation", {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
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

describe("automation dashboard API GET authorization contract", () => {
  beforeEach(() => {
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  afterEach(() => {
    delete process.env.GITHUB_AUTOMATION_READ_TOKEN;
    delete process.env.GITHUB_AUTOMATION_REPO;
  });

  it("returns 401 for unauthenticated requests", async () => {
    const response = await GET(requestWithCookies({}));
    assert.equal(response.status, 401);

    const body = (await response.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, "UNAUTHORIZED");
  });

  it("returns 403 for authenticated admin without dashboard.view", async () => {
    const token = createSessionToken([["crm.view", "ALL"]]);
    const response = await GET(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: token }),
    );
    assert.equal(response.status, 403);

    const body = (await response.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, "FORBIDDEN");
  });

  it("returns 200 with dashboard payload for authorized dashboard viewer", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await GET(
      requestWithCookies({ [ADMIN_STAFF_SESSION_COOKIE]: token }),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      configured: boolean;
      summary: {
        totalOpen: number;
        building: number;
        stalledOrFailed: number;
        needsFix: number;
        readyToMerge: number;
        mergedToday: number;
      };
      tasks: unknown[];
      fetchedAt: string;
    };

    assert.equal(body.configured, false);
    assert.equal(typeof body.fetchedAt, "string");
    assert.deepEqual(body.summary, {
      totalOpen: 0,
      building: 0,
      stalledOrFailed: 0,
      needsFix: 0,
      readyToMerge: 0,
      mergedToday: 0,
    });
    assert.deepEqual(body.tasks, []);
  });
});
