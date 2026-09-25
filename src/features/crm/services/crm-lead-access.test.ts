import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import {
  assertCanViewCrmLeadDetail,
  assertCanViewCrmLeads,
  resolveCrmLeadListAssignedToFilter,
} from "@/features/crm/services/crm-lead-access";

function sessionWithCrmView(overrides: Partial<AdminSessionUser> = {}): AdminSessionUser {
  return {
    authenticated: true,
    mode: "user",
    userId: "user-1",
    username: "sales1",
    employeeId: "emp-1",
    roleId: "role-1",
    roleCode: "SALES",
    legacyEmployeeRole: null,
    permissions: new Map([["crm.view", "ALL"]]),
    ...overrides,
  };
}

describe("assertCanViewCrmLeads", () => {
  it("allows authenticated users with crm.view", () => {
    assert.doesNotThrow(() =>
      assertCanViewCrmLeads(sessionWithCrmView({ employeeId: "emp-1" }))
    );
  });

  it("rejects unauthenticated or missing crm.view", () => {
    assert.throws(() => assertCanViewCrmLeads({ ...sessionWithCrmView({ employeeId: "emp-1" }), authenticated: false }));
    assert.throws(() =>
      assertCanViewCrmLeads({
        ...sessionWithCrmView({ employeeId: "emp-1" }),
        permissions: new Map(),
      })
    );
  });
});

describe("resolveCrmLeadListAssignedToFilter", () => {
  it("forces OWN scope to the session employee", () => {
    const session = sessionWithCrmView({
      employeeId: "emp-own",
      permissions: new Map([["crm.view", "OWN"]]),
    });
    assert.equal(resolveCrmLeadListAssignedToFilter(session, "emp-other"), "emp-own");
  });

  it("preserves requested filter for ALL scope", () => {
    const session = sessionWithCrmView({ employeeId: "emp-1" });
    assert.equal(resolveCrmLeadListAssignedToFilter(session, "emp-other"), "emp-other");
    assert.equal(resolveCrmLeadListAssignedToFilter(session, undefined), undefined);
  });
});

describe("assertCanViewCrmLeadDetail", () => {
  it("allows OWN scope only for assigned leads", () => {
    const session = sessionWithCrmView({
      employeeId: "emp-own",
      permissions: new Map([["crm.view", "OWN"]]),
    });
    assert.doesNotThrow(() =>
      assertCanViewCrmLeadDetail(session, { assignedTo: "emp-own" })
    );
    assert.throws(() =>
      assertCanViewCrmLeadDetail(session, { assignedTo: "emp-other" })
    );
  });
});
