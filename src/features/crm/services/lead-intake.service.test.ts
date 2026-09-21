import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIntakeAuditTitle,
  buildOwnerChangeAuditContent,
  isLeadFollowUpOverdue,
  mapIntakeChannelToDefaultSource,
  resolveLeadIntakeIdentity,
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
