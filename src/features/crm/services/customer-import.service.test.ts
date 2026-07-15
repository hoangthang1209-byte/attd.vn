import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { read, utils, write } from "xlsx";
import {
  buildCustomerImportTemplate,
  CUSTOMER_IMPORT_COLUMNS,
  parseCustomerImportFile,
} from "@/features/crm/services/customer-import.service";

const OLD_MVP_COLUMNS = [
  "Company Name",
  "Customer Code",
  "Tax Code",
  "Contact Name",
  "Phone",
  "Email",
  "Address",
  "Province",
  "Website",
  "Notes",
] as const;

function makeWorkbookFile(headers: readonly string[], row: readonly string[]) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet([[...headers], [...row]]), "Customers");
  const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
  return new File([buffer], "CustomerImportTemplate.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("customer import template", () => {
  it("contains current CRM customer fields", () => {
    const workbook = read(buildCustomerImportTemplate(), { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const [headers] = utils.sheet_to_json<string[]>(worksheet, { header: 1 });

    assert.deepEqual(headers, [...CUSTOMER_IMPORT_COLUMNS]);
    assert.ok(headers.includes("Legal Name"));
    assert.ok(headers.includes("Customer Type"));
    assert.ok(headers.includes("Customer Status"));
    assert.ok(headers.includes("Representative Name"));
    assert.ok(headers.includes("Contact Position"));
    assert.ok(headers.includes("Internal Notes"));
    assert.ok(headers.includes("Billing Notes"));
  });
});

describe("customer import parser", () => {
  it("keeps old MVP template compatibility", async () => {
    const rows = await parseCustomerImportFile(
      makeWorkbookFile(OLD_MVP_COLUMNS, [
        "Old Co",
        "OLD-1",
        "0312345678",
        "Old Contact",
        "0901234567",
        "old@example.com",
        "1 Old St",
        "HCM",
        "old.example.com",
        "Old note",
      ]),
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].companyName, "Old Co");
    assert.equal(rows[0].customerCode, "OLD-1");
    assert.equal(rows[0].contactName, "Old Contact");
    assert.equal(rows[0].addressLine1, "");
    assert.equal(rows[0].internalNotes, "");
  });

  it("parses the full template and ignores unknown columns", async () => {
    const headers = [...CUSTOMER_IMPORT_COLUMNS, "Unknown Column"];
    const rows = await parseCustomerImportFile(
      makeWorkbookFile(headers, [
        "Full Co",
        "Full Legal Co",
        "FULL-1",
        "Business",
        "Đang hoạt động",
        "0312345679",
        "028123456",
        "company@example.com",
        "full.example.com",
        "Legacy address",
        "12 Full St",
        "Floor 2",
        "Hồ Chí Minh",
        "Quận 1",
        "Phường Bến Nghé",
        "Ông",
        "Nguyen Van A",
        "Director",
        "AUTH-1",
        "Tran Thi B",
        "Buyer",
        "Procurement",
        "0901234567",
        "contact@example.com",
        "zalo-id",
        "Contact note",
        "Customer note",
        "Internal note",
        "Billing note",
        "Ignored",
      ]),
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].legalName, "Full Legal Co");
    assert.equal(rows[0].customerType, "Business");
    assert.equal(rows[0].customerStatus, "Đang hoạt động");
    assert.equal(rows[0].addressLine1, "12 Full St");
    assert.equal(rows[0].ward, "Phường Bến Nghé");
    assert.equal(rows[0].representativeSalutation, "Ông");
    assert.equal(rows[0].contactEmail, "contact@example.com");
    assert.equal(rows[0].billingNotes, "Billing note");
  });
});
