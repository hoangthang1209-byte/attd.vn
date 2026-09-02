import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuickCreateCustomerPayload,
  minimalCustomerRecord,
  pickQuickCreateContact,
} from "@/features/crm/customer-quick-create";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";

function makeContact(
  overrides: Partial<CrmContactRecord> & Pick<CrmContactRecord, "id" | "fullName">,
): CrmContactRecord {
  return {
    customerId: "cust-1",
    title: null,
    department: null,
    phone: null,
    email: null,
    zalo: null,
    isPrimary: false,
    note: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("buildQuickCreateCustomerPayload", () => {
  it("creates customer-only payload when contact fields are empty", () => {
    const payload = buildQuickCreateCustomerPayload({
      name: "CÔNG TY TNHH AXXEL MARKETING VIỆT NAM",
      taxCode: "0318795661",
    });

    assert.equal(payload.type, "BUSINESS");
    assert.equal(payload.name, "CÔNG TY TNHH AXXEL MARKETING VIỆT NAM");
    assert.equal(payload.taxCode, "0318795661");
    assert.equal(payload.primaryContact, null);
  });

  it("links primary contact when contact name is provided", () => {
    const payload = buildQuickCreateCustomerPayload({
      name: "CÔNG TY TNHH AXXEL MARKETING VIỆT NAM",
      taxCode: "0318795661",
      contactFullName: "TRA LINH",
      contactEmail: "linh.nguyen@axxel.biz",
    });

    assert.ok(payload.primaryContact);
    assert.equal(payload.primaryContact?.fullName, "TRA LINH");
    assert.equal(payload.primaryContact?.email, "linh.nguyen@axxel.biz");
  });

  it("does not create contact when only partial contact fields are provided without name", () => {
    const payload = buildQuickCreateCustomerPayload({
      name: "Test Co",
      contactEmail: "only@email.com",
    });

    assert.equal(payload.primaryContact, null);
  });
});

describe("pickQuickCreateContact", () => {
  const customer: CrmCustomerRecord = {
    ...minimalCustomerRecord({ id: "cust-1", name: "Test", code: "T-1" }),
    contacts: [
      makeContact({ id: "c1", fullName: "TRA LINH", email: "linh@axxel.biz" }),
      makeContact({ id: "c2", fullName: "Other", isPrimary: true }),
    ],
  };

  it("prefers exact contact name match", () => {
    const contact = pickQuickCreateContact(customer, "TRA LINH");
    assert.equal(contact?.id, "c1");
  });

  it("returns null when contact name is blank", () => {
    assert.equal(pickQuickCreateContact(customer, ""), null);
  });
});

describe("minimalCustomerRecord", () => {
  it("provides display fields for batch customer summary", () => {
    const record = minimalCustomerRecord({
      id: "id-1",
      name: "AXXEL",
      code: "AXX-1",
    });
    assert.equal(record.id, "id-1");
    assert.equal(record.name, "AXXEL");
    assert.equal(record.code, "AXX-1");
    assert.equal(record.status, "ACTIVE");
  });
});
