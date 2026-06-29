/**
 * Curated stable demo images for ATTD B2B catalog — Patch 24.9.4b
 * Uses fixed Unsplash photo IDs (no AI generation, no brand logos).
 */

type ImageSet = {
  featured: string;
  gallery: string[];
  variant?: string;
};

/** Build a stable Unsplash crop URL. */
function u(photoId: string, w = 1200, h = 1200): string {
  return `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&q=82&auto=format`;
}

// ─── Theme library (fixed photo paths) ────────────────────────────────────────

const PHOTOS = {
  tshirtBlank: "photo-1521572163474-6864f9cf17ab",
  tshirtStack: "photo-1622445275463-0902cb1b34db",
  tshirtFlat: "photo-1583743814966-8936f5b7be1a",
  polo: "photo-1586363104862-3a5e2ab60d99",
  jacket: "photo-1551028719-22170c16caca",
  hoodie: "photo-1556821840-3a63f95609a7",
  cap: "photo-1588851261407-ed78c53bb17a",
  bucketHat: "photo-1521369906089-5404c2701e00",
  tote: "photo-1594221708779-94832f4320df",
  toteCanvas: "photo-1590874103328-eac67a8432a4",
  bottle: "photo-1602143407151-7111542de6e8",
  bottleAlt: "photo-1523362628745-0c100150b504",
  fabric: "photo-1558171814-43c9227729af",
  bandana: "photo-1601925260368-ae2f83cf8b7f",
  giftBox: "photo-1513885535751-8b9238bd345a",
  giftSet: "photo-1513885535751-8b9238bd345a",
  warehouse: "photo-1586528116311-ad8dd3c8310d",
  workshop: "photo-1565043589221-1a6fd0e4a83c",
  uniform: "photo-1620799140408-edc7defb1710",
  packaging: "photo-1612817159947-27c3496b9f63",
  office: "photo-1497366216548-37526070297c",
  blogBiz: "photo-1460925895917-afdab827c52f",
  blogFabric: "photo-1558171814-43c9227729af",
  blogGift: "photo-1513885535751-8b9238bd345a",
  blogTeam: "photo-1522071820081-009f0129c71c",
  blogOem: "photo-1565043589221-1a6fd0e4a83c",
  landingSourcing: "photo-1586528116311-ad8dd3c8310d",
  landingDealer: "photo-1497366216548-37526070297c",
} as const;

function set(
  featured: keyof typeof PHOTOS,
  gallery: (keyof typeof PHOTOS)[],
  variant?: keyof typeof PHOTOS,
): ImageSet {
  return {
    featured: u(PHOTOS[featured], 1200, 1200),
    gallery: gallery.map((k, i) =>
      u(PHOTOS[k], 1200, i === 0 ? 1200 : 900),
    ),
    ...(variant ? { variant: u(PHOTOS[variant], 800, 800) } : {}),
  };
}

// ─── Category images ────────────────────────────────────────────────────────────

export const categoryDemoImages: Record<string, string> = {
  "ao-thun-tron": u(PHOTOS.tshirtBlank, 1400, 900),
  "ao-polo-tron": u(PHOTOS.polo, 1400, 900),
  "ao-khoac-dong-phuc": u(PHOTOS.jacket, 1400, 900),
  "non-dong-phuc": u(PHOTOS.cap, 1400, 900),
  non: u(PHOTOS.cap, 1400, 900),
  "tote-bag": u(PHOTOS.tote, 1400, 900),
  tote: u(PHOTOS.tote, 1400, 900),
  "binh-giu-nhiet": u(PHOTOS.bottle, 1400, 900),
  "khan-bandana": u(PHOTOS.bandana, 1400, 900),
  bandana: u(PHOTOS.bandana, 1400, 900),
  "gift-set-doanh-nghiep": u(PHOTOS.giftSet, 1400, 900),
  "oem-private-label": u(PHOTOS.workshop, 1400, 900),
};

// ─── Product images by slug ───────────────────────────────────────────────────

export const productDemoImages: Record<string, ImageSet> = {
  "ao-thun-cvc-basic": set("tshirtBlank", ["tshirtStack", "fabric", "tshirtFlat"], "tshirtBlank"),
  "ao-thun-cotton-2-chieu": set("tshirtStack", ["tshirtBlank", "fabric"], "tshirtStack"),
  "ao-polo-ca-sau-poly": set("polo", ["tshirtFlat", "uniform", "fabric"], "polo"),
  "ao-polo-cotton-cao-cap": set("polo", ["uniform", "tshirtFlat"], "polo"),
  "ao-khoac-gio-dong-phuc": set("jacket", ["uniform", "fabric"], "jacket"),
  "hoodie-tron-oem": set("hoodie", ["jacket", "fabric"], "hoodie"),
  "non-luoi-trai-cotton": set("cap", ["bucketHat", "uniform"], "cap"),
  "non-bucket-su-kien": set("bucketHat", ["cap", "uniform"], "bucketHat"),
  "tote-canvas-basic": set("toteCanvas", ["tote", "packaging"], "toteCanvas"),
  "tui-vai-khong-det": set("tote", ["toteCanvas", "packaging"], "tote"),
  "binh-giu-nhiet-inox-500ml": set("bottle", ["bottleAlt", "giftBox"], "bottle"),
  "binh-nuoc-tritan-600ml": set("bottleAlt", ["bottle", "giftBox"], "bottleAlt"),
  "khan-bandana-polyester-60x60": set("bandana", ["fabric", "tshirtFlat"], "bandana"),
  "khan-bandana-cotton-55x55": set("fabric", ["bandana", "tshirtBlank"], "fabric"),
  "combo-gift-set-onboarding": set("giftSet", ["giftBox", "packaging", "tote"], "giftSet"),
  "combo-qua-tang-hoi-nghi": set("giftBox", ["giftSet", "bottle", "tote"], "giftBox"),
  "ao-polo-oem-private-label": set("workshop", ["polo", "uniform", "fabric"], "polo"),
  "bo-dong-phuc-su-kien-agency": set("uniform", ["tshirtBlank", "polo", "cap"], "uniform"),
};

/** Fallback by category slug when product slug not mapped. */
export const productCategoryFallbackImages: Record<string, ImageSet> = {
  "ao-thun-tron": set("tshirtBlank", ["tshirtStack", "fabric"]),
  "ao-polo-tron": set("polo", ["uniform", "fabric"]),
  "ao-khoac-dong-phuc": set("jacket", ["hoodie", "uniform"]),
  "non-dong-phuc": set("cap", ["bucketHat", "uniform"]),
  "tote-bag": set("tote", ["toteCanvas", "packaging"]),
  "binh-giu-nhiet": set("bottle", ["bottleAlt", "giftBox"]),
  "khan-bandana": set("bandana", ["fabric", "tshirtFlat"]),
  "gift-set-doanh-nghiep": set("giftSet", ["giftBox", "packaging"]),
  "oem-private-label": set("workshop", ["uniform", "fabric"]),
};

export function getProductDemoImages(
  productSlug: string,
  categorySlug: string,
): ImageSet {
  return (
    productDemoImages[productSlug] ??
    productCategoryFallbackImages[categorySlug] ??
    set("tshirtBlank", ["fabric", "warehouse"])
  );
}

// ─── Blog featured images ─────────────────────────────────────────────────────

export const blogDemoImages: Record<string, string> = {
  "kho-si-dong-phuc-la-gi": u(PHOTOS.warehouse, 1400, 788),
  "ao-thun-cvc-tc-cotton-khac-nhau": u(PHOTOS.fabric, 1400, 788),
  "moq-la-gi-don-hang-si": u(PHOTOS.blogBiz, 1400, 788),
  "combo-qua-tang-doanh-nghiep-hoi-nghi": u(PHOTOS.giftSet, 1400, 788),
  "cach-chon-ao-polo-tron-dong-phuc": u(PHOTOS.polo, 1400, 788),
  "checklist-dat-hang-dong-phuc-agency": u(PHOTOS.blogTeam, 1400, 788),
  "non-dong-phuc-si-cach-chon": u(PHOTOS.cap, 1400, 788),
  "oem-private-label-dong-phuc": u(PHOTOS.workshop, 1400, 788),
  "tote-bag-canvas-vs-tui-vai-khong-det": u(PHOTOS.tote, 1400, 788),
  "chuan-bi-file-thiet-ke-qua-tang": u(PHOTOS.packaging, 1400, 788),
};

export function getBlogDemoImage(slug: string): string {
  return blogDemoImages[slug] ?? u(PHOTOS.blogBiz, 1400, 788);
}

// ─── Landing page hero images ─────────────────────────────────────────────────

export const landingDemoImages: Record<string, string> = {
  "nguon-hang": u(PHOTOS.landingSourcing, 1600, 900),
  "ao-thun-tron": u(PHOTOS.tshirtBlank, 1600, 900),
  "ao-polo-tron": u(PHOTOS.polo, 1600, 900),
  "qua-tang-doanh-nghiep": u(PHOTOS.giftSet, 1600, 900),
  oem: u(PHOTOS.workshop, 1600, 900),
  "dai-ly": u(PHOTOS.landingDealer, 1600, 900),
};

export function getLandingDemoImage(slug: string): string {
  return landingDemoImages[slug] ?? u(PHOTOS.warehouse, 1600, 900);
}

/** Nav / footer / hero accent images */
export const NAV_VISUAL_IMAGE = u(PHOTOS.warehouse, 600, 400);
export const MEGA_MENU_CTA_IMAGE = u(PHOTOS.tshirtStack, 480, 320);
