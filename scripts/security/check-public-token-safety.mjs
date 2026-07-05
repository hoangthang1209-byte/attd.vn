import assert from "node:assert/strict";

const PUBLIC_TOKEN_FORBIDDEN_FIELDS = [
  "internalNote",
  "internalNotes",
  "costPrice",
  "costEstimate",
  "marginAmount",
  "marginRate",
  "manualOverrideReason",
  "pricingSnapshot",
  "inputSnapshot",
  "resultSnapshot",
  "metadata",
  "assignedToAdminUserId",
  "staffOnlyIdentifiers",
  "privateCustomerDetails",
];

const forbiddenFieldSet = new Set(
  PUBLIC_TOKEN_FORBIDDEN_FIELDS.map((field) => field.toLowerCase()),
);
const forbiddenFieldCanonical = new Map(
  PUBLIC_TOKEN_FORBIDDEN_FIELDS.map((field) => [field.toLowerCase(), field]),
);

function getForbiddenField(field) {
  const normalized = field.toLowerCase();
  if (!forbiddenFieldSet.has(normalized)) return null;
  return forbiddenFieldCanonical.get(normalized) ?? field;
}

function assertPublicTokenSafePayload(payload) {
  const forbiddenFields = new Set();
  collectForbiddenFields(payload, forbiddenFields, new WeakSet());
  if (forbiddenFields.size === 0) return { ok: true };
  return { ok: false, forbiddenFields: [...forbiddenFields].sort() };
}

function containsForbiddenPublicTokenField(value) {
  return assertPublicTokenSafePayload(value).ok === false;
}

function collectForbiddenFields(value, forbiddenFields, seen) {
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const canonicalField = getForbiddenField(value);
      if (canonicalField) forbiddenFields.add(canonicalField);
    }
    return;
  }

  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectForbiddenFields(item, forbiddenFields, seen);
    return;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const canonicalField = getForbiddenField(key);
    if (canonicalField) forbiddenFields.add(canonicalField);
    collectForbiddenFields(childValue, forbiddenFields, seen);
  }
}

function expectSafe(payload, label) {
  const result = assertPublicTokenSafePayload(payload);
  assert.equal(result.ok, true, `${label} should be safe`);
  assert.equal(
    containsForbiddenPublicTokenField(payload),
    false,
    `${label} should not contain forbidden fields`,
  );
}

function expectUnsafe(payload, expectedFields, label) {
  const result = assertPublicTokenSafePayload(payload);
  assert.equal(result.ok, false, `${label} should be unsafe`);
  if (!result.ok) {
    assert.deepEqual(
      result.forbiddenFields,
      expectedFields.sort(),
      `${label} forbidden fields mismatch`,
    );
  }
  assert.equal(
    containsForbiddenPublicTokenField(payload),
    true,
    `${label} should contain forbidden fields`,
  );
}

expectSafe(
  {
    quoteNo: "BG-001",
    customerCompany: "Cong ty ABC",
    totalAmount: 1200000,
    currency: "VND",
    items: [
      {
        productNameSnapshot: "Ao thun",
        skuSnapshot: "ATTD-TEE",
        quantity: 100,
        unitPrice: 12000,
        lineTotal: 1200000,
      },
    ],
    customerNote: "Giao trong gio hanh chinh",
  },
  "safe public quote payload",
);

expectUnsafe(
  {
    quoteNo: "BG-002",
    internalNote: "Staff only",
    item: {
      costPrice: 10000,
      manualOverrideReason: "Internal approval",
    },
  },
  ["costPrice", "internalNote", "manualOverrideReason"],
  "nested forbidden fields",
);

expectUnsafe(
  {
    quoteNo: "BG-003",
    items: [
      { productNameSnapshot: "Ao polo", quantity: 50 },
      { pricingSnapshot: { base: 10000 }, marginRate: 0.2 },
    ],
  },
  ["marginRate", "pricingSnapshot"],
  "array forbidden fields",
);

expectUnsafe(
  {
    quoteNo: "BG-004",
    CostEstimate: 10000,
    AssignedToAdminUserId: "admin_1",
    ResultSnapshot: { total: 12000 },
  },
  ["assignedToAdminUserId", "costEstimate", "resultSnapshot"],
  "case-insensitive forbidden fields",
);

expectSafe(
  {
    quoteNo: "BG-005",
    metadataLabel: "Thong tin hien thi",
    customerContactName: "Nguyen Van A",
    publicTokenLabel: "Ma xem bao gia",
    manufacturingEvidence: [
      {
        title: "Xu ly vai",
        description: "Mo ta cong khai",
        mediaUrl: "https://example.test/image.jpg",
      },
    ],
  },
  "allowed public fields",
);

console.log("Public token safety checks passed.");
