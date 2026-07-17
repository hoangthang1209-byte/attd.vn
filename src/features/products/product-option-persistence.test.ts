import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPersistedOptionsPayload,
  countActiveOptionValues,
  isPersistedProductRelationId,
  optionGroupsMissingPersistedIds,
  OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR,
} from "./product-option-persistence";

describe("isPersistedProductRelationId", () => {
  it("rejects client-only option/value keys", () => {
    assert.equal(isPersistedProductRelationId("val-abc12xy"), false);
    assert.equal(isPersistedProductRelationId("opt-zz9kq1a"), false);
    assert.equal(isPersistedProductRelationId(undefined), false);
    assert.equal(isPersistedProductRelationId(""), false);
  });

  it("accepts database cuid/uuid style ids", () => {
    assert.equal(isPersistedProductRelationId("cmroqaoxi0000l004pviickpv"), true);
    assert.equal(isPersistedProductRelationId("550e8400-e29b-41d4-a716-446655440000"), true);
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
