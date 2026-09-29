import assert from "node:assert/strict";
import test from "node:test";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { buildScopedLeadWhere, canAccessLeadRecord } from "@/features/auth/lead-scope";
import { normalizeLeadEmail, normalizeLeadPhone } from "@/features/crm/lead-identity";

function salesSession(employeeId = "emp-sales-1"): AdminSessionUser {
  return {
    authenticated: true,
    mode: "legacy",
    userId: "user-1",
    username: "sales",
    employeeId,
    roleId: null,
    roleCode: "SALES",
    legacyEmployeeRole: "SALES",
    permissions: new Map(),
  };
}

test("normalizeLeadPhone treats Vietnam international and local forms equally", () => {
  assert.equal(normalizeLeadPhone("+84 901 234 567"), "0901234567");
  assert.equal(normalizeLeadPhone("0901 234 567"), "0901234567");
});

test("normalizeLeadEmail trims and lowercases", () => {
  assert.equal(normalizeLeadEmail(" Sales@Example.COM "), "sales@example.com");
});

test("legacy sales can access new owner, legacy owner, and truly unassigned lead", () => {
  const session = salesSession();
  assert.equal(
    canAccessLeadRecord(session, { assignedEmployeeId: "emp-sales-1", assignedTo: null }),
    true,
  );
  assert.equal(
    canAccessLeadRecord(session, { assignedEmployeeId: null, assignedTo: "emp-sales-1" }),
    true,
  );
  assert.equal(
    canAccessLeadRecord(session, { assignedEmployeeId: null, assignedTo: null }),
    true,
  );
});

test("legacy sales cannot access a lead owned by another sales user", () => {
  const session = salesSession();
  assert.equal(
    canAccessLeadRecord(session, { assignedEmployeeId: "emp-sales-2", assignedTo: null }),
    false,
  );
  assert.equal(
    canAccessLeadRecord(session, { assignedEmployeeId: null, assignedTo: "emp-sales-2" }),
    false,
  );
});

test("OWN lead query includes new owner, legacy owner and only truly unassigned records", () => {
  const where = buildScopedLeadWhere(salesSession());
  assert.deepEqual(where, {
    OR: [
      { assignedEmployeeId: "emp-sales-1" },
      { assignedTo: "emp-sales-1" },
      { AND: [{ assignedEmployeeId: null }, { assignedTo: null }] },
    ],
  });
});
