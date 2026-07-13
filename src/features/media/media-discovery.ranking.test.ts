import assert from "node:assert/strict";
import { describe, it } from "node:test";

type FakeAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  caption: string | null;
  description: string | null;
  filename: string;
  originalName: string | null;
  tags: string[];
  keywords: string[];
  aiTags: string[];
  visibility: "PUBLIC" | "INTERNAL" | "PRIVATE";
  orientation: "LANDSCAPE" | "PORTRAIT" | "SQUARE" | "UNKNOWN";
  width: number | null;
  height: number | null;
  createdAt: Date;
  library: { id: string; code: string; name: string; isActive: boolean } | null;
  role: { id: string; code: string; name: string; isActive: boolean } | null;
};

function scoreLikeDiscovery(
  asset: FakeAsset,
  input: {
    query?: string;
    libraries?: string[];
    roles?: string[];
  },
): number {
  let score = 0;
  const query = (input.query ?? "").trim().toLowerCase();
  const libraries = (input.libraries ?? []).map((c) => c.toUpperCase());
  const roles = (input.roles ?? []).map((c) => c.toUpperCase());

  if (asset.visibility !== "PUBLIC") return -1;

  if (query && asset.title?.toLowerCase().includes(query)) score += 10;
  if (query && asset.altText?.toLowerCase().includes(query)) score += 8;
  for (const token of query.split(/\s+/).filter(Boolean)) {
    if (asset.tags.some((t) => t.toLowerCase().includes(token))) score += 7;
    if (asset.keywords.some((k) => k.toLowerCase().includes(token))) score += 7;
  }
  if (asset.library && libraries.includes(asset.library.code)) score += 5;
  if (asset.role && roles.includes(asset.role.code)) score += 5;
  if (asset.orientation === "LANDSCAPE") score += 3;
  if (asset.altText?.trim()) score += 2;
  if (asset.width && asset.height) score += 1;
  return score;
}

describe("media discovery ranking heuristics", () => {
  const factory: FakeAsset = {
    id: "1",
    title: "Xưởng may áo thun số lượng lớn",
    altText: "Nhà máy may áo thun",
    caption: null,
    description: null,
    filename: "factory.jpg",
    originalName: "factory.jpg",
    tags: ["xưởng may", "sản xuất"],
    keywords: ["áo thun"],
    aiTags: [],
    visibility: "PUBLIC",
    orientation: "LANDSCAPE",
    width: 1200,
    height: 800,
    createdAt: new Date("2024-01-01"),
    library: { id: "ml_manufacturing", code: "MANUFACTURING", name: "Sản xuất", isActive: true },
    role: { id: "mr_factory", code: "FACTORY", name: "Nhà máy", isActive: true },
  };

  const general: FakeAsset = {
    id: "2",
    title: "Ảnh chung",
    altText: null,
    caption: null,
    description: null,
    filename: "general.jpg",
    originalName: "general.jpg",
    tags: [],
    keywords: [],
    aiTags: [],
    visibility: "PUBLIC",
    orientation: "UNKNOWN",
    width: null,
    height: null,
    createdAt: new Date("2025-01-01"),
    library: { id: "ml_general", code: "GENERAL", name: "Chung", isActive: true },
    role: { id: "mr_general", code: "GENERAL", name: "Chung", isActive: true },
  };

  const customerLogo: FakeAsset = {
    id: "3",
    title: "Logo khách hàng ABC",
    altText: "logo khách hàng",
    caption: null,
    description: null,
    filename: "logo.png",
    originalName: "logo.png",
    tags: ["logo khách hàng"],
    keywords: ["khách hàng"],
    aiTags: [],
    visibility: "PUBLIC",
    orientation: "SQUARE",
    width: 400,
    height: 400,
    createdAt: new Date("2024-06-01"),
    library: { id: "ml_customer", code: "CUSTOMER", name: "Khách hàng", isActive: true },
    role: { id: "mr_customer_logo", code: "CUSTOMER_LOGO", name: "Logo khách hàng", isActive: true },
  };

  const internalFactory: FakeAsset = {
    ...factory,
    id: "4",
    visibility: "INTERNAL",
  };

  it("ranks manufacturing/factory above unrelated media for xưởng may áo thun", () => {
    const input = {
      query: "xưởng may áo thun",
      libraries: ["MANUFACTURING", "PRODUCT"],
      roles: ["FACTORY", "PROCESS", "FEATURED"],
    };
    const factoryScore = scoreLikeDiscovery(factory, input);
    const generalScore = scoreLikeDiscovery(general, input);
    assert.ok(factoryScore > generalScore);
  });

  it("ranks customer logo above general images for logo khách hàng", () => {
    const input = {
      query: "logo khách hàng",
      libraries: ["CUSTOMER"],
      roles: ["CUSTOMER_LOGO", "LOGO"],
    };
    assert.ok(scoreLikeDiscovery(customerLogo, input) > scoreLikeDiscovery(general, input));
  });

  it("excludes INTERNAL and PRIVATE by default scoring gate", () => {
    assert.equal(scoreLikeDiscovery(internalFactory, { query: "xưởng may" }), -1);
  });
});
