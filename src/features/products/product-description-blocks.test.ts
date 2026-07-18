import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_DESCRIPTION_MAX_BLOCKS,
  applyMediaLibraryUrlsToDescriptionBlocks,
  createEmptyHeadingBlock,
  createEmptyImageBlock,
  createEmptyParagraphBlock,
  createProductDescriptionBlockId,
  descriptionBlocksReferenceMediaAsset,
  extractMediaIdsFromDescriptionBlocks,
  hasVisibleDescriptionBlocks,
  hydratePublicDescriptionBlocks,
  parseProductDescriptionBlocks,
  ProductDescriptionBlocksValidationError,
  resolveDescriptionImageUrl,
  toPublicDescriptionBlocks,
} from "@/features/products/product-description-blocks";

function validImageBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: createProductDescriptionBlockId(),
    type: "image",
    mediaId: "media_abc",
    imageUrl: "https://cdn.example.com/products/stale.jpg",
    alt: "Áo polo xanh navy",
    caption: "Mẫu thực tế",
    layout: "content",
    ...overrides,
  };
}

describe("product description blocks schema", () => {
  it("parses known block types", () => {
    const blocks = parseProductDescriptionBlocks([
      { id: "h1", type: "heading", level: 2, text: "Chất liệu" },
      { id: "p1", type: "paragraph", text: "Cotton 100%." },
      { id: "l1", type: "bulletList", items: ["Thoáng mát", "Bền màu"] },
      validImageBlock({ id: "i1" }),
      {
        id: "g1",
        type: "imageGrid",
        items: [
          {
            mediaId: "m1",
            imageUrl: "https://cdn.example.com/1.jpg",
            alt: "Ảnh 1",
          },
          {
            mediaId: "m2",
            imageUrl: "https://cdn.example.com/2.jpg",
            alt: "Ảnh 2",
            caption: "Chi tiết",
          },
        ],
      },
    ]);
    assert.equal(blocks?.length, 5);
    assert.equal(hasVisibleDescriptionBlocks(blocks), true);
  });

  it("rejects unknown block types", () => {
    assert.throws(
      () =>
        parseProductDescriptionBlocks([
          { id: "x", type: "html", html: "<script>alert(1)</script>" },
        ]),
      (err: unknown) =>
        err instanceof ProductDescriptionBlocksValidationError &&
        /không được hỗ trợ|không hợp lệ/i.test(err.message),
    );
  });

  it("rejects unknown keys on blocks", () => {
    assert.throws(
      () =>
        parseProductDescriptionBlocks([
          { id: "p1", type: "paragraph", text: "Ok", style: "color:red" },
        ]),
      ProductDescriptionBlocksValidationError,
    );
  });

  it("rejects above maximum block count", () => {
    const raw = Array.from({ length: PRODUCT_DESCRIPTION_MAX_BLOCKS + 1 }, (_, i) => ({
      id: `p-${i}`,
      type: "paragraph",
      text: `Đoạn ${i + 1}`,
    }));
    assert.throws(
      () => parseProductDescriptionBlocks(raw),
      (err: unknown) =>
        err instanceof ProductDescriptionBlocksValidationError &&
        err.message.includes(String(PRODUCT_DESCRIPTION_MAX_BLOCKS)),
    );
  });

  it("requires image alt text and rejects partial image input", () => {
    assert.throws(
      () => parseProductDescriptionBlocks([validImageBlock({ alt: "   " })]),
      ProductDescriptionBlocksValidationError,
    );
    assert.throws(
      () =>
        parseProductDescriptionBlocks([
          {
            id: "partial",
            type: "image",
            mediaId: "media_1",
            imageUrl: "",
            alt: "",
            layout: "content",
          },
        ]),
      (err: unknown) =>
        err instanceof ProductDescriptionBlocksValidationError &&
        /chưa hoàn chỉnh/i.test(err.message),
    );
    assert.throws(
      () =>
        parseProductDescriptionBlocks([
          {
            id: "alt-only",
            type: "image",
            mediaId: "",
            imageUrl: "",
            alt: "Có alt nhưng chưa chọn ảnh",
            layout: "content",
          },
        ]),
      (err: unknown) =>
        err instanceof ProductDescriptionBlocksValidationError &&
        /chưa hoàn chỉnh/i.test(err.message),
    );
  });

  it("keeps one-item imageGrid (does not normalize to image)", () => {
    const blocks = parseProductDescriptionBlocks([
      {
        id: "g",
        type: "imageGrid",
        items: [
          { mediaId: "m1", imageUrl: "https://cdn.example.com/1.jpg", alt: "a" },
          { mediaId: "", imageUrl: "", alt: "", caption: "" },
        ],
      },
    ]);
    assert.equal(blocks?.length, 1);
    assert.equal(blocks![0].type, "imageGrid");
    if (blocks![0].type === "imageGrid") {
      assert.equal(blocks![0].items.length, 1);
    }
  });

  it("rejects imageGrid with more than 2 items", () => {
    assert.throws(
      () =>
        parseProductDescriptionBlocks([
          {
            id: "g",
            type: "imageGrid",
            items: [
              { mediaId: "m1", imageUrl: "https://cdn.example.com/1.jpg", alt: "a" },
              { mediaId: "m2", imageUrl: "https://cdn.example.com/2.jpg", alt: "b" },
              { mediaId: "m3", imageUrl: "https://cdn.example.com/3.jpg", alt: "c" },
            ],
          },
        ]),
      (err: unknown) =>
        err instanceof ProductDescriptionBlocksValidationError &&
        /tối đa 2/i.test(err.message),
    );
  });

  it("rejects javascript/data/blob URLs in snapshots", () => {
    for (const imageUrl of ["javascript:alert(1)", "data:text/html,x", "blob:https://x/y"]) {
      assert.throws(
        () => parseProductDescriptionBlocks([validImageBlock({ imageUrl })]),
        ProductDescriptionBlocksValidationError,
      );
    }
  });

  it("allows image without client imageUrl (mediaId canonical)", () => {
    const blocks = parseProductDescriptionBlocks([
      {
        id: "i1",
        type: "image",
        mediaId: "media_abc",
        alt: "Áo polo",
        layout: "full",
      },
    ]);
    assert.equal(blocks?.length, 1);
    if (blocks![0].type === "image") {
      assert.equal(blocks![0].imageUrl, "");
      assert.equal(blocks![0].mediaId, "media_abc");
    }
  });

  it("strips fully empty draft blocks to null", () => {
    assert.equal(
      parseProductDescriptionBlocks([
        createEmptyHeadingBlock(),
        createEmptyParagraphBlock(),
        createEmptyImageBlock(),
      ]),
      null,
    );
  });

  it("treats empty array as legacy fallback candidate", () => {
    assert.equal(parseProductDescriptionBlocks([]), null);
    assert.equal(hasVisibleDescriptionBlocks(null), false);
    assert.equal(hasVisibleDescriptionBlocks([]), false);
  });

  it("extracts and dedupes media IDs", () => {
    const ids = extractMediaIdsFromDescriptionBlocks([
      validImageBlock({ mediaId: "m1" }),
      {
        id: "g",
        type: "imageGrid",
        items: [
          { mediaId: "m1", imageUrl: "https://cdn.example.com/1.jpg", alt: "a" },
          { mediaId: "m2", imageUrl: "https://cdn.example.com/2.jpg", alt: "b" },
        ],
      },
    ]);
    assert.deepEqual(ids.sort(), ["m1", "m2"]);
  });

  it("public serializer keeps only safe block fields", () => {
    const publicBlocks = toPublicDescriptionBlocks([
      {
        id: "i1",
        type: "image",
        mediaId: "media_abc",
        imageUrl: "https://cdn.example.com/products/a.jpg",
        alt: "Áo polo",
        caption: "Mẫu",
        layout: "full",
      },
    ]);
    assert.ok(publicBlocks);
    assert.deepEqual(Object.keys(publicBlocks![0]).sort(), [
      "alt",
      "caption",
      "id",
      "imageUrl",
      "layout",
      "mediaId",
      "type",
    ]);
  });

  it("fails safely on stale malformed JSON for public helpers", () => {
    assert.equal(toPublicDescriptionBlocks(null), null);
    assert.deepEqual(
      extractMediaIdsFromDescriptionBlocks([{ type: "image", mediaId: "keep" }, null]),
      ["keep"],
    );
  });
});

describe("mediaId canonical URL resolution", () => {
  it("prefers library URL over stale snapshot", () => {
    assert.equal(
      resolveDescriptionImageUrl(
        "https://cdn.example.com/current.jpg",
        "https://cdn.example.com/stale.jpg",
      ),
      "https://cdn.example.com/current.jpg",
    );
  });

  it("falls back to safe snapshot when library missing", () => {
    assert.equal(
      resolveDescriptionImageUrl(null, "https://cdn.example.com/stale.jpg"),
      "https://cdn.example.com/stale.jpg",
    );
    assert.equal(resolveDescriptionImageUrl(null, "javascript:alert(1)"), null);
  });

  it("applyMediaLibraryUrls overwrites client snapshot and rejects arbitrary missing ids", () => {
    const parsed = parseProductDescriptionBlocks([
      validImageBlock({
        mediaId: "asset-1",
        imageUrl: "https://evil.example.com/hijack.jpg",
      }),
    ]);
    assert.ok(parsed);
    const resolved = applyMediaLibraryUrlsToDescriptionBlocks(
      parsed!,
      new Map([["asset-1", { id: "asset-1", url: "https://cdn.attd.vn/library.jpg" }]]),
    );
    assert.equal(resolved[0].type, "image");
    if (resolved[0].type === "image") {
      assert.equal(resolved[0].imageUrl, "https://cdn.attd.vn/library.jpg");
    }

    assert.throws(
      () =>
        applyMediaLibraryUrlsToDescriptionBlocks(
          parsed!,
          new Map(), // missing media — cannot trust client URL
        ),
      ProductDescriptionBlocksValidationError,
    );
  });

  it("hydratePublic prefers library URL and drops broken images safely", () => {
    const hydrated = hydratePublicDescriptionBlocks(
      [
        {
          id: "i1",
          type: "image",
          mediaId: "asset-1",
          imageUrl: "https://cdn.example.com/stale.jpg",
          alt: "Polo",
          layout: "content",
        },
        {
          id: "i2",
          type: "image",
          mediaId: "missing",
          imageUrl: "javascript:alert(1)",
          alt: "Bad",
          layout: "content",
        },
      ],
      new Map([["asset-1", { id: "asset-1", url: "https://cdn.attd.vn/live.jpg" }]]),
    );
    assert.equal(hydrated?.length, 1);
    if (hydrated![0].type === "image") {
      assert.equal(hydrated![0].imageUrl, "https://cdn.attd.vn/live.jpg");
    }
  });
});

describe("media reference protection helpers", () => {
  it("treats descriptionBlocks mediaId as in-use", () => {
    const blocks = [validImageBlock({ mediaId: "only-in-desc" })];
    assert.equal(descriptionBlocksReferenceMediaAsset(blocks, "only-in-desc"), true);
    assert.equal(descriptionBlocksReferenceMediaAsset(blocks, "other"), false);
  });

  it("removing blocks releases the reference", () => {
    assert.equal(descriptionBlocksReferenceMediaAsset(null, "only-in-desc"), false);
    assert.equal(descriptionBlocksReferenceMediaAsset([], "only-in-desc"), false);
  });

  it("dedupes duplicate media ids without overcount assumptions", () => {
    const ids = extractMediaIdsFromDescriptionBlocks([
      validImageBlock({ mediaId: "shared" }),
      {
        id: "g",
        type: "imageGrid",
        items: [
          { mediaId: "shared", imageUrl: "https://cdn.example.com/a.jpg", alt: "a" },
          { mediaId: "shared", imageUrl: "https://cdn.example.com/a.jpg", alt: "b" },
        ],
      },
    ]);
    assert.deepEqual(ids, ["shared"]);
  });
});

describe("product description legacy fallback helpers", () => {
  it("rich blocks override when visible content exists", () => {
    const blocks = parseProductDescriptionBlocks([
      { id: "p1", type: "paragraph", text: "Rich content" },
    ]);
    assert.equal(hasVisibleDescriptionBlocks(blocks), true);
  });

  it("falls back when blocks missing", () => {
    assert.equal(hasVisibleDescriptionBlocks(undefined), false);
    assert.equal(hasVisibleDescriptionBlocks(null), false);
  });
});
