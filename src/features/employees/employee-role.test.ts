import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSalesCapableEmployeeRoleFilter,
  isSalesCapableEmployeeRole,
  SALES_CAPABLE_EMPLOYEE_ROLES,
} from "@/features/employees/employee-role";

describe("buildSalesCapableEmployeeRoleFilter", () => {
  it("includes SALES, ADMIN, and legacy null roles", () => {
    const filter = buildSalesCapableEmployeeRoleFilter();
    assert.ok(Array.isArray(filter.OR));
    assert.deepEqual(filter.OR?.[0], { role: { in: SALES_CAPABLE_EMPLOYEE_ROLES } });
    assert.deepEqual(filter.OR?.[1], { role: null });
  });

  it("matches isSalesCapableEmployeeRole for representative roles", () => {
    for (const role of ["SALES", "ADMIN", null, "PRODUCTION", "DELIVERY"] as const) {
      const included =
        role === null ||
        SALES_CAPABLE_EMPLOYEE_ROLES.includes(role as (typeof SALES_CAPABLE_EMPLOYEE_ROLES)[number]);
      assert.equal(isSalesCapableEmployeeRole(role), included);
    }
  });
});
