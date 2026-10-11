import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { handleAgentRunsGet } from "@/app/api/admin/automation/agent-runs/route";
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
    `http://localhost/api/admin/automation/agent-runs?issueNumber=${issueNumber}&limit=10`,
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
    listAgentRunsForIssue: async ({ issueNumber }: { issueNumber: number; limit?: number }) => ({
      currentRun: null,
      runs: [],
      issueNumber,
    }),
  };
}

describe("agent-runs API GET authorization contract", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const response = await handleAgentRunsGet(requestForIssue(186), loadMockService);
    assert.equal(response.status, 401);
  });

  it("returns 403 without dashboard.view", async () => {
    const token = createSessionToken([["crm.view", "ALL"]]);
    const response = await handleAgentRunsGet(requestForIssue(186, token), loadMockService);
    assert.equal(response.status, 403);
  });

  it("returns 200 for dashboard viewer", async () => {
    const token = createSessionToken([["dashboard.view", "ALL"]]);
    const response = await handleAgentRunsGet(requestForIssue(186, token), loadMockService);
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      issueNumber: number;
      currentRun: null;
      runs: unknown[];
    };
    assert.equal(body.issueNumber, 186);
    assert.equal(body.currentRun, null);
    assert.deepEqual(body.runs, []);
  });
});
