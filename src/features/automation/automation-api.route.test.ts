import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { NextRequest } from "next/server";
import { ADMIN_STAFF_SESSION_COOKIE } from "@/lib/admin-auth/constants";
import type { SessionPermissionGrant } from "@/lib/admin-auth/admin-session.shared";
import {
  buildUserSessionPayload,
  createAdminSessionToken as createIdentitySessionToken,
} from "@/lib/admin-auth/staff-session-node";
import type { AutomationDashboardView } from "@/features/automation/automation-task.types";

process.env.ADMIN_PASSWORD = "test-admin-password";

const EMPTY_SUMMARY = {
  totalOpen: { value: 0, isPartial: false },
  building: { value: 0, isPartial: false },
  stalledOrFailed: { value: 0, isPartial: false },
  needsFix: { value: 0, isPartial: false },
  readyToMerge: { value: 0, isPartial: false },
  mergedToday: { value: 0, isPartial: false },
} as const;

mock.module("@/features/automation/automation-task.service", {
  namedExports: {
    getAutomationDashboard: async (view: AutomationDashboardView = "active") => ({
      configured: false,
      configMessage:
        "Thiếu GITHUB_AUTOMATION_READ_TOKEN. Cấu hình token read-only trên Vercel để tải task automation từ GitHub.",
      summary: EMPTY_SUMMARY,
      tasks: [],
      fetchedAt: new Date().toISOString(),
      view,
      productionCommitSha: null,
      productionCheckedAt: null,
    }),
  },
});

const { GET } = await import("@/app/api/admin/automation/route");

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
      view: string;
      summary: {
        totalOpen: { value: number; isPartial: boolean };
        building: { value: number; isPartial: boolean };
        stalledOrFailed: { value: number; isPartial: boolean };
        needsFix: { value: number; isPartial: boolean };
        readyToMerge: { value: number; isPartial: boolean };
        mergedToday: { value: number; isPartial: boolean };
      };
      tasks: unknown[];
      fetchedAt: string;
      productionCommitSha: string | null;
      productionCheckedAt: string | null;
    };

    assert.equal(body.configured, false);
    assert.equal(body.view, "active");
    assert.equal(typeof body.fetchedAt, "string");
    assert.equal(body.productionCommitSha, null);
    assert.equal(body.productionCheckedAt, null);
    assert.deepEqual(body.summary, EMPTY_SUMMARY);
    assert.deepEqual(body.tasks, []);
  });

  it("accepts view query parameter for all-tasks mode", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await GET(
      new NextRequest("http://localhost/api/admin/automation?view=all", {
        method: "GET",
        headers: { cookie: `${ADMIN_STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}` },
      }),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as { view: string };
    assert.equal(body.view, "all");
  });

  it("accepts view query parameter for completed mode", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await GET(
      new NextRequest("http://localhost/api/admin/automation?view=completed", {
        method: "GET",
        headers: { cookie: `${ADMIN_STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}` },
      }),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as { view: string };
    assert.equal(body.view, "completed");
  });
});
