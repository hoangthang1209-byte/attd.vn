import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOptionsFingerprint,
  buildPersistedOptionsPayload,
  countActiveOptionValues,
  findMatchingOptionGroup,
  findMatchingOptionValue,
  isPersistedProductRelationId,
  optionGroupsMissingPersistedIds,
  OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR,
} from "./product-option-persistence";
import { resolveOptionValueRefFromGroups } from "./product-variant-matrix.utils";

describe("isPersistedProductRelationId", () => {
  it("rejects client-only option/value/tmp keys and empty values", () => {
    assert.equal(isPersistedProductRelationId("val-abc12xy"), false);
    assert.equal(isPersistedProductRelationId("opt-zz9kq1a"), false);
    assert.equal(isPersistedProductRelationId("tmp-123abcd"), false);
    assert.equal(isPersistedProductRelationId(undefined), false);
    assert.equal(isPersistedProductRelationId(null), false);
    assert.equal(isPersistedProductRelationId(""), false);
  });

  it("accepts database cuid and uuid style ids", () => {
    assert.equal(isPersistedProductRelationId("cmroqaoxi0000l004pviickpv"), true);
    assert.equal(isPersistedProductRelationId("cmrp1myfu0004jv04peaeq9y9"), true);
    assert.equal(isPersistedProductRelationId("550e8400-e29b-41d4-a716-446655440000"), true);
  });
});

describe("resolveOptionValueRefFromGroups cuid preservation", () => {
  it("keeps prisma cuid option value ids unchanged", () => {
    const cuid = "cmrp1myfu0004jv04peaeq9y9";
    const resolved = resolveOptionValueRefFromGroups(
      [
        {
          clientKey: "opt-1",
          name: "Màu sắc",
          slug: "color",
          values: [{ id: cuid, clientKey: cuid, label: "Vàng" }],
        },
      ],
      cuid,
    );
    assert.equal(resolved, cuid);
  });
});

describe("buildPersistedOptionsPayload", () => {
  it("strips client keys so matrix save never sends stale optionValueIds", () => {
    const payload = buildPersistedOptionsPayload([
      {
        clientKey: "opt-local1",
        name: "Màu sắc",
        slug: "color",
        sortOrder: 0,
        values: [
          {
            clientKey: "val-local1",
            label: "Đỏ",
            valueCode: "RED",
            imageUrl: "",
            sortOrder: 0,
          },
          {
            id: "cmroval0001persisted",
            clientKey: "cmroval0001persisted",
            label: "Navy",
            valueCode: "NVY",
            imageUrl: "",
            sortOrder: 1,
          },
        ],
      },
      {
        id: "cmroopt0001persisted",
        clientKey: "cmroopt0001persisted",
        name: "Kích thước",
        slug: "size",
        sortOrder: 1,
        values: [
          {
            clientKey: "val-size-s",
            label: "S",
            valueCode: "S",
            imageUrl: "",
            sortOrder: 0,
          },
        ],
      },
    ]);

    assert.equal(payload[0]?.id, undefined);
    assert.equal(payload[0]?.values[0]?.id, undefined);
    assert.equal(payload[0]?.values[1]?.id, "cmroval0001persisted");
    assert.equal(payload[1]?.id, "cmroopt0001persisted");
    assert.equal(payload[1]?.values[0]?.id, undefined);
    assert.deepEqual(
      payload.map((group) => group.values.map((value) => value.label)),
      [["Đỏ", "Navy"], ["S"]],
    );
  });
});

describe("idempotent option matching helpers", () => {
  it("matches existing option groups by slug when ids are omitted", () => {
    const existing = [
      { id: "opt-db-color", name: "Màu sắc", slug: "color" },
      { id: "opt-db-size", name: "Kích thước", slug: "size" },
    ];
    const claimed = new Set<string>();
    const color = findMatchingOptionGroup(
      { name: "Màu sắc", slug: "color" },
      existing,
      claimed,
    );
    assert.equal(color?.id, "opt-db-color");
    claimed.add(color!.id);
    const size = findMatchingOptionGroup(
      { name: "Kích thước", slug: "size" },
      existing,
      claimed,
    );
    assert.equal(size?.id, "opt-db-size");
  });

  it("matches existing option values by normalized label when ids are omitted", () => {
    const existing = [
      { id: "val-red", label: "Đỏ", valueCode: "RED" },
      { id: "val-navy", label: "Navy", valueCode: "NVY" },
    ];
    const claimed = new Set<string>();
    const red = findMatchingOptionValue({ label: "đỏ" }, existing, claimed);
    assert.equal(red?.id, "val-red");
    claimed.add(red!.id);
    const navy = findMatchingOptionValue({ label: "Navy", valueCode: "NVY" }, existing, claimed);
    assert.equal(navy?.id, "val-navy");
  });

  it("buildOptionsFingerprint is stable for equivalent option sets", () => {
    const a = buildOptionsFingerprint([
      { name: "Màu sắc", slug: "color", values: [{ label: "Đỏ", valueCode: "RED" }] },
    ]);
    const b = buildOptionsFingerprint([
      { name: "  màu sắc ", slug: "color", values: [{ label: " đỏ ", valueCode: "red" }] },
    ]);
    assert.equal(a, b);
  });
});

describe("optionGroupsMissingPersistedIds", () => {
  it("detects unsaved values that must block matrix execute", () => {
    assert.equal(
      optionGroupsMissingPersistedIds([
        {
          clientKey: "opt-1",
          name: "Màu sắc",
          slug: "color",
          sortOrder: 0,
          values: [
            {
              clientKey: "val-1",
              label: "Xanh lá",
              valueCode: "",
              imageUrl: "",
              sortOrder: 0,
            },
          ],
        },
      ]),
      true,
    );
    assert.equal(
      optionGroupsMissingPersistedIds([
        {
          id: "cmrooptpersisted001",
          clientKey: "cmrooptpersisted001",
          name: "Màu sắc",
          slug: "color",
          sortOrder: 0,
          values: [
            {
              id: "cmrovalpersisted001",
              clientKey: "cmrovalpersisted001",
              label: "Xanh lá",
              valueCode: "",
              imageUrl: "",
              sortOrder: 0,
            },
          ],
        },
      ]),
      false,
    );
    assert.equal(countActiveOptionValues([
      {
        clientKey: "opt-1",
        name: "Màu sắc",
        slug: "color",
        sortOrder: 0,
        values: [
          { clientKey: "a", label: "Đỏ", valueCode: "", imageUrl: "", sortOrder: 0 },
          { clientKey: "b", label: "Navy", valueCode: "", imageUrl: "", sortOrder: 1 },
        ],
      },
    ]), 2);
    assert.match(OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR, /chưa được lưu/);
  });
});

describe("server preview wiring source checks", () => {
  it("ProductCatalogVariantsSection saves once then fetches server preview", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/admin/products/ProductCatalogVariantsSection.tsx"),
      "utf8",
    );
    assert.match(source, /Đang kiểm tra tổ hợp\.\.\./);
    assert.match(source, /fetchServerMatrixPreview/);
    assert.match(source, /variant-matrix/);
    assert.match(source, /serverMatrixPreview/);
    assert.match(source, /MATRIX_PREVIEW_STALE_ERROR/);
    assert.doesNotMatch(source, /Re-save right before execute/);
  });
});
