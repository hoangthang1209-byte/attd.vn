import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSalesCapableEmployeeRole } from "@/features/employees/employee-role";
import {
  authorizeLeadIntakeRequest,
  buildIntakeAuditTitle,
  buildOwnerChangeAuditContent,
  isLeadFollowUpOverdue,
  mapIntakeChannelToDefaultSource,
  resolveLeadIntakeIdentity,
  resolveValidatedSalesOwnerId,
  sanitizeIntakeMetadata,
  sanitizeSourceRef,
} from "@/features/crm/lead-intake.utils";
import { mapOperationalStatusLabel } from "@/features/crm/services/lead-intake.service";

describe("sanitizeSourceRef", () => {
  it("trims and caps sourceRef length", () => {
    const long = "a".repeat(300);
    assert.equal(sanitizeSourceRef(long)?.length, 255);
    assert.equal(sanitizeSourceRef("  gmail-msg-1  "), "gmail-msg-1");
    assert.equal(sanitizeSourceRef(""), null);
  });
});

describe("sanitizeIntakeMetadata", () => {
  it("keeps safe scalar metadata only", () => {
    const result = sanitizeIntakeMetadata({
      campaign: "spring",
      count: 3,
      active: true,
      nested: { bad: true },
      huge: "x".repeat(600),
    });
    assert.ok(result);
    assert.equal(result?.campaign, "spring");
    assert.equal(result?.count, 3);
    assert.equal(result?.active, true);
    assert.equal("nested" in (result ?? {}), false);
    assert.equal((result?.huge as string).length, 500);
  });
});

describe("resolveLeadIntakeIdentity", () => {
  it("prefers contact and company names", () => {
    const identity = resolveLeadIntakeIdentity({
      channel: "WEBSITE",
      source: "WEBSITE",
      contactName: "An",
      companyName: "ATTD",
      phone: "0900000000",
    });
    assert.equal(identity.contactName, "An");
    assert.equal(identity.companyName, "ATTD");
    assert.equal(identity.fullName, "An");
  });
});

describe("isLeadFollowUpOverdue", () => {
  it("detects overdue follow-up before start of today", () => {
    const now = new Date("2026-09-21T10:00:00Z");
    assert.equal(isLeadFollowUpOverdue("2026-09-20T15:00:00Z", null, now), true);
    assert.equal(isLeadFollowUpOverdue("2026-09-21T15:00:00Z", null, now), false);
    assert.equal(isLeadFollowUpOverdue(null, null, now), false);
  });
});

describe("mapIntakeChannelToDefaultSource", () => {
  it("maps Gmail channel to GMAIL source", () => {
    assert.equal(mapIntakeChannelToDefaultSource("GMAIL"), "GMAIL");
    assert.equal(mapIntakeChannelToDefaultSource("MANUAL"), "MANUAL");
  });
});

describe("buildIntakeAuditTitle", () => {
  it("labels idempotent replay distinctly", () => {
    assert.match(buildIntakeAuditTitle(false, "source_ref"), /idempotent replay/);
    assert.match(buildIntakeAuditTitle(true, "new"), /created/);
  });
});

describe("buildOwnerChangeAuditContent", () => {
  it("records owner transition with names when available", () => {
    const content = buildOwnerChangeAuditContent("emp-1", "emp-2", "Alice", "Bob");
    assert.equal(content, "Alice → Bob");
  });
});

describe("mapOperationalStatusLabel", () => {
  it("maps existing statuses to operational Vietnamese labels", () => {
    assert.equal(mapOperationalStatusLabel("NEW"), "Mới");
    assert.equal(mapOperationalStatusLabel("CONTACTED"), "Đang liên hệ");
    assert.equal(mapOperationalStatusLabel("QUOTED"), "Đã báo giá");
    assert.equal(mapOperationalStatusLabel("WON"), "Chốt");
  });
});

describe("resolveValidatedSalesOwnerId", () => {
  it("accepts active SALES and ADMIN employees", () => {
    assert.equal(
      resolveValidatedSalesOwnerId({ id: "emp-1", isActive: true, role: "SALES" }),
      "emp-1"
    );
    assert.equal(
      resolveValidatedSalesOwnerId({ id: "emp-2", isActive: true, role: "ADMIN" }),
      "emp-2"
    );
    assert.equal(
      resolveValidatedSalesOwnerId({ id: "emp-3", isActive: true, role: null }),
      "emp-3"
    );
  });

  it("rejects inactive or non-sales-capable employees", () => {
    assert.equal(
      resolveValidatedSalesOwnerId({ id: "emp-4", isActive: false, role: "SALES" }),
      null
    );
    assert.equal(
      resolveValidatedSalesOwnerId({ id: "emp-5", isActive: true, role: "PRODUCTION" }),
      null
    );
    assert.equal(resolveValidatedSalesOwnerId(null), null);
  });
});

describe("isSalesCapableEmployeeRole", () => {
  it("allows SALES, ADMIN, and unset role", () => {
    assert.equal(isSalesCapableEmployeeRole("SALES"), true);
    assert.equal(isSalesCapableEmployeeRole("ADMIN"), true);
    assert.equal(isSalesCapableEmployeeRole(null), true);
    assert.equal(isSalesCapableEmployeeRole("DELIVERY"), false);
  });
});

describe("authorizeLeadIntakeRequest", () => {
  it("accepts bearer or x-cron-secret when configured", () => {
    assert.equal(
      authorizeLeadIntakeRequest({
        authorizationHeader: "Bearer secret-1",
        cronSecretHeader: null,
        configuredSecret: "secret-1",
      }),
      true
    );
    assert.equal(
      authorizeLeadIntakeRequest({
        authorizationHeader: null,
        cronSecretHeader: "secret-1",
        configuredSecret: "secret-1",
      }),
      true
    );
  });

  it("rejects missing or mismatched secrets", () => {
    assert.equal(
      authorizeLeadIntakeRequest({
        authorizationHeader: "Bearer wrong",
        cronSecretHeader: null,
        configuredSecret: "secret-1",
      }),
      false
    );
    assert.equal(
      authorizeLeadIntakeRequest({
        authorizationHeader: null,
        cronSecretHeader: null,
        configuredSecret: null,
      }),
      false
    );
  });
});
