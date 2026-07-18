export class ProductDescriptionBlocksValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ProductDescriptionBlocksValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export const PRODUCT_DESCRIPTION_MAX_BLOCKS = 40;
export const PRODUCT_DESCRIPTION_HEADING_MAX = 160;
export const PRODUCT_DESCRIPTION_PARAGRAPH_MAX = 4000;
export const PRODUCT_DESCRIPTION_BULLET_MAX_ITEMS = 20;
export const PRODUCT_DESCRIPTION_BULLET_ITEM_MAX = 300;
export const PRODUCT_DESCRIPTION_CAPTION_MAX = 240;
export const PRODUCT_DESCRIPTION_ALT_MAX = 200;

export type ProductDescriptionHeadingBlock = {
  id: string;
  type: "heading";
  level: 2 | 3;
  text: string;
};

export type ProductDescriptionParagraphBlock = {
  id: string;
  type: "paragraph";
  text: string;
};

export type ProductDescriptionBulletListBlock = {
  id: string;
  type: "bulletList";
  items: string[];
};

export type ProductDescriptionImageBlock = {
  id: string;
  type: "image";
  /** Canonical Media Library asset id. */
  mediaId: string;
  /** Snapshot/fallback URL — always overwritten from Media Library on save when asset exists. */
  imageUrl: string;
  alt: string;
  caption?: string;
  layout: "full" | "content";
};

export type ProductDescriptionImageGridItem = {
  mediaId: string;
  imageUrl: string;
  alt: string;
  caption?: string;
};

export type ProductDescriptionImageGridBlock = {
  id: string;
  type: "imageGrid";
  /** Deterministic: 1–2 validated items (one-item grids are valid). */
  items: ProductDescriptionImageGridItem[];
};

export type ProductDescriptionBlock =
  | ProductDescriptionHeadingBlock
  | ProductDescriptionParagraphBlock
  | ProductDescriptionBulletListBlock
  | ProductDescriptionImageBlock
  | ProductDescriptionImageGridBlock;

/** Public-safe projection — mediaId + resolved URL only; no internal media metadata. */
export type PublicProductDescriptionBlock = ProductDescriptionBlock;

export type MediaLibraryUrlRecord = {
  id: string;
  url: string;
};

const UNSAFE_URL = /^(javascript|data|vbscript|blob):/i;

const HEADING_KEYS = new Set(["id", "type", "level", "text"]);
const PARAGRAPH_KEYS = new Set(["id", "type", "text"]);
const BULLET_KEYS = new Set(["id", "type", "items"]);
const IMAGE_KEYS = new Set(["id", "type", "mediaId", "imageUrl", "alt", "caption", "layout"]);
const IMAGE_ITEM_KEYS = new Set(["mediaId", "imageUrl", "alt", "caption"]);
const IMAGE_GRID_KEYS = new Set(["id", "type", "items"]);

export function createProductDescriptionBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pdb-${crypto.randomUUID()}`;
  }
  return `pdb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_URL.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function requireNonEmptyString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ProductDescriptionBlocksValidationError("Giá trị mô tả nâng cao không hợp lệ.", {
      [field]: "Giá trị không hợp lệ.",
    });
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ProductDescriptionBlocksValidationError("Mô tả nâng cao không được chứa khối trống.", {
      [field]: "Không được để trống.",
    });
  }
  if (trimmed.length > max) {
    throw new ProductDescriptionBlocksValidationError("Nội dung mô tả nâng cao vượt quá giới hạn.", {
      [field]: `Tối đa ${max} ký tự.`,
    });
  }
  return trimmed;
}

function assertKnownKeys(
  raw: Record<string, unknown>,
  allowed: Set<string>,
  fieldPrefix: string,
): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new ProductDescriptionBlocksValidationError("Khối mô tả chứa trường không được hỗ trợ.", {
        [`${fieldPrefix}.${key}`]: `Trường "${key}" không hợp lệ.`,
      });
    }
  }
}

function parseOptionalSafeSnapshotUrl(value: unknown, field: string): string {
  if (value == null || value === "") return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (!isSafeHttpUrl(trimmed)) {
    throw new ProductDescriptionBlocksValidationError("URL ảnh mô tả không hợp lệ.", {
      [field]: "Chỉ chấp nhận URL http/https. Không dùng javascript/data/blob hoặc URL ngoài thư viện media.",
    });
  }
  return trimmed;
}

/**
 * Parse one image slot. `mediaId` is canonical; client `imageUrl` is optional snapshot only
 * and must never be trusted as the source of truth (resolved from Media Library on save).
 */
function parseImageItem(
  raw: unknown,
  fieldPrefix: string,
): ProductDescriptionImageGridItem {
  if (!raw || typeof raw !== "object") {
    throw new ProductDescriptionBlocksValidationError("Hình ảnh mô tả không hợp lệ.", {
      [fieldPrefix]: "Dữ liệu ảnh không hợp lệ.",
    });
  }
  const item = raw as Record<string, unknown>;
  assertKnownKeys(item, IMAGE_ITEM_KEYS, fieldPrefix);
  const mediaId = requireNonEmptyString(item.mediaId, `${fieldPrefix}.mediaId`, 64);
  const alt = requireNonEmptyString(item.alt, `${fieldPrefix}.alt`, PRODUCT_DESCRIPTION_ALT_MAX);
  const imageUrl = parseOptionalSafeSnapshotUrl(item.imageUrl, `${fieldPrefix}.imageUrl`);
  let caption: string | undefined;
  if (item.caption != null && String(item.caption).trim()) {
    caption = requireNonEmptyString(
      item.caption,
      `${fieldPrefix}.caption`,
      PRODUCT_DESCRIPTION_CAPTION_MAX,
    );
  }
  return { mediaId, imageUrl, alt, caption };
}

function imageSlotHasAnyInput(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return Boolean(
    String(row.mediaId ?? "").trim() ||
      String(row.imageUrl ?? "").trim() ||
      String(row.alt ?? "").trim() ||
      String(row.caption ?? "").trim(),
  );
}

function imageSlotIsComplete(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return Boolean(String(row.mediaId ?? "").trim() && String(row.alt ?? "").trim());
}

type BlockDraftKind = "empty" | "partial" | "ready";

function classifyDraftBlock(entry: unknown): BlockDraftKind {
  if (!entry || typeof entry !== "object") return "empty";
  const block = entry as Record<string, unknown>;
  const type = String(block.type ?? "");

  if (type === "heading" || type === "paragraph") {
    return String(block.text ?? "").trim() ? "ready" : "empty";
  }
  if (type === "bulletList") {
    if (!Array.isArray(block.items)) return "empty";
    const filled = block.items.filter((item) => String(item ?? "").trim());
    return filled.length ? "ready" : "empty";
  }
  if (type === "image") {
    const hasAny =
      String(block.mediaId ?? "").trim() ||
      String(block.imageUrl ?? "").trim() ||
      String(block.alt ?? "").trim() ||
      String(block.caption ?? "").trim();
    if (!hasAny) return "empty";
    if (!String(block.mediaId ?? "").trim() || !String(block.alt ?? "").trim()) return "partial";
    return "ready";
  }
  if (type === "imageGrid") {
    if (!Array.isArray(block.items)) return "empty";
    const withInput = block.items.filter(imageSlotHasAnyInput);
    if (withInput.length === 0) return "empty";
    if (withInput.some((item) => !imageSlotIsComplete(item))) return "partial";
    return "ready";
  }
  // Unknown type: keep for typed rejection later.
  return "ready";
}

/**
 * Parse and validate description blocks.
 * - `undefined` → omit from update
 * - `null` / `[]` / only empty drafts → `null` (clear)
 * - Fully empty blocks are stripped
 * - Partially completed blocks with user input are rejected (not silently dropped)
 */
export function parseProductDescriptionBlocks(
  raw: unknown,
  options?: { fieldPrefix?: string },
): ProductDescriptionBlock[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Array.isArray(raw)) {
    throw new ProductDescriptionBlocksValidationError("Mô tả nâng cao phải là danh sách khối nội dung.", {
      descriptionBlocks: "Định dạng không hợp lệ.",
    });
  }

  const prefix = options?.fieldPrefix ?? "descriptionBlocks";
  for (let index = 0; index < raw.length; index += 1) {
    if (classifyDraftBlock(raw[index]) === "partial") {
      throw new ProductDescriptionBlocksValidationError(
        "Mô tả nâng cao còn khối chưa hoàn chỉnh. Vui lòng bổ sung alt text / chọn ảnh từ thư viện media hoặc xóa khối đó.",
        {
          [`${prefix}.${index}`]:
            "Khối chưa đủ dữ liệu (ảnh cần mediaId từ thư viện và alt text).",
        },
      );
    }
  }

  const stripped = raw.filter((entry) => classifyDraftBlock(entry) !== "empty");
  if (stripped.length === 0) return null;
  if (stripped.length > PRODUCT_DESCRIPTION_MAX_BLOCKS) {
    throw new ProductDescriptionBlocksValidationError(
      `Mô tả nâng cao tối đa ${PRODUCT_DESCRIPTION_MAX_BLOCKS} khối.`,
      { descriptionBlocks: `Tối đa ${PRODUCT_DESCRIPTION_MAX_BLOCKS} khối.` },
    );
  }

  const blocks: ProductDescriptionBlock[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < stripped.length; index += 1) {
    const entry = stripped[index];
    if (!entry || typeof entry !== "object") {
      throw new ProductDescriptionBlocksValidationError("Khối mô tả không hợp lệ.", {
        [`${prefix}.${index}`]: "Khối không hợp lệ.",
      });
    }
    const block = entry as Record<string, unknown>;
    const type = String(block.type ?? "");
    const id = requireNonEmptyString(block.id ?? createProductDescriptionBlockId(), `${prefix}.${index}.id`, 80);
    if (seenIds.has(id)) {
      throw new ProductDescriptionBlocksValidationError("ID khối mô tả bị trùng.", {
        [`${prefix}.${index}.id`]: "ID bị trùng.",
      });
    }
    seenIds.add(id);

    if (type === "heading") {
      assertKnownKeys(block, HEADING_KEYS, `${prefix}.${index}`);
      const levelRaw = Number(block.level);
      const level = levelRaw === 3 ? 3 : levelRaw === 2 ? 2 : null;
      if (level == null) {
        throw new ProductDescriptionBlocksValidationError("Cấp tiêu đề mô tả không hợp lệ.", {
          [`${prefix}.${index}.level`]: "Chỉ hỗ trợ H2 hoặc H3.",
        });
      }
      blocks.push({
        id,
        type: "heading",
        level,
        text: requireNonEmptyString(block.text, `${prefix}.${index}.text`, PRODUCT_DESCRIPTION_HEADING_MAX),
      });
      continue;
    }

    if (type === "paragraph") {
      assertKnownKeys(block, PARAGRAPH_KEYS, `${prefix}.${index}`);
      blocks.push({
        id,
        type: "paragraph",
        text: requireNonEmptyString(
          block.text,
          `${prefix}.${index}.text`,
          PRODUCT_DESCRIPTION_PARAGRAPH_MAX,
        ),
      });
      continue;
    }

    if (type === "bulletList") {
      assertKnownKeys(block, BULLET_KEYS, `${prefix}.${index}`);
      if (!Array.isArray(block.items)) {
        throw new ProductDescriptionBlocksValidationError("Danh sách gạch đầu dòng không được trống.", {
          [`${prefix}.${index}.items`]: "Cần ít nhất 1 mục.",
        });
      }
      const items = block.items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
      if (items.length === 0) {
        throw new ProductDescriptionBlocksValidationError("Danh sách gạch đầu dòng không được trống.", {
          [`${prefix}.${index}.items`]: "Cần ít nhất 1 mục.",
        });
      }
      if (items.length > PRODUCT_DESCRIPTION_BULLET_MAX_ITEMS) {
        throw new ProductDescriptionBlocksValidationError(
          `Danh sách tối đa ${PRODUCT_DESCRIPTION_BULLET_MAX_ITEMS} mục.`,
          { [`${prefix}.${index}.items`]: `Tối đa ${PRODUCT_DESCRIPTION_BULLET_MAX_ITEMS} mục.` },
        );
      }
      for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (items[itemIndex].length > PRODUCT_DESCRIPTION_BULLET_ITEM_MAX) {
          throw new ProductDescriptionBlocksValidationError("Nội dung mô tả nâng cao vượt quá giới hạn.", {
            [`${prefix}.${index}.items.${itemIndex}`]: `Tối đa ${PRODUCT_DESCRIPTION_BULLET_ITEM_MAX} ký tự.`,
          });
        }
      }
      blocks.push({ id, type: "bulletList", items });
      continue;
    }

    if (type === "image") {
      assertKnownKeys(block, IMAGE_KEYS, `${prefix}.${index}`);
      const mediaId = requireNonEmptyString(block.mediaId, `${prefix}.${index}.mediaId`, 64);
      const alt = requireNonEmptyString(block.alt, `${prefix}.${index}.alt`, PRODUCT_DESCRIPTION_ALT_MAX);
      const imageUrl = parseOptionalSafeSnapshotUrl(block.imageUrl, `${prefix}.${index}.imageUrl`);
      let caption: string | undefined;
      if (block.caption != null && String(block.caption).trim()) {
        caption = requireNonEmptyString(
          block.caption,
          `${prefix}.${index}.caption`,
          PRODUCT_DESCRIPTION_CAPTION_MAX,
        );
      }
      const layout = block.layout === "full" || block.layout === "content" ? block.layout : "content";
      blocks.push({
        id,
        type: "image",
        mediaId,
        imageUrl,
        alt,
        caption,
        layout,
      });
      continue;
    }

    if (type === "imageGrid") {
      assertKnownKeys(block, IMAGE_GRID_KEYS, `${prefix}.${index}`);
      if (!Array.isArray(block.items)) {
        throw new ProductDescriptionBlocksValidationError("Lưới ảnh cần ít nhất 1 ảnh.", {
          [`${prefix}.${index}.items`]: "Thiếu ảnh.",
        });
      }
      if (block.items.length > 2) {
        throw new ProductDescriptionBlocksValidationError("Lưới ảnh tối đa 2 hình.", {
          [`${prefix}.${index}.items`]: "Tối đa 2 hình ảnh.",
        });
      }
      // Deterministic: keep only slots with input; one-item grids remain imageGrid.
      const filledItems = block.items.filter(imageSlotHasAnyInput);
      if (filledItems.length === 0) {
        throw new ProductDescriptionBlocksValidationError("Lưới ảnh cần ít nhất 1 ảnh.", {
          [`${prefix}.${index}.items`]: "Thiếu ảnh.",
        });
      }
      if (filledItems.length > 2) {
        throw new ProductDescriptionBlocksValidationError("Lưới ảnh tối đa 2 hình.", {
          [`${prefix}.${index}.items`]: "Tối đa 2 hình ảnh.",
        });
      }
      blocks.push({
        id,
        type: "imageGrid",
        items: filledItems.map((item, itemIndex) =>
          parseImageItem(item, `${prefix}.${index}.items.${itemIndex}`),
        ),
      });
      continue;
    }

    throw new ProductDescriptionBlocksValidationError("Loại khối mô tả không được hỗ trợ.", {
      [`${prefix}.${index}.type`]: `Loại "${type}" không hợp lệ.`,
    });
  }

  return blocks;
}

export function hasVisibleDescriptionBlocks(
  blocks: ProductDescriptionBlock[] | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  return blocks.some((block) => {
    if (block.type === "heading" || block.type === "paragraph") return Boolean(block.text.trim());
    if (block.type === "bulletList") return block.items.some((item) => item.trim());
    if (block.type === "image") {
      return Boolean(block.alt.trim() && (block.mediaId.trim() || block.imageUrl.trim()));
    }
    if (block.type === "imageGrid") {
      return block.items.some(
        (item) => item.alt.trim() && (item.mediaId.trim() || item.imageUrl.trim()),
      );
    }
    return false;
  });
}

function collectMediaIdsLoose(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  const ids = new Set<string>();
  for (const entry of blocks) {
    if (!entry || typeof entry !== "object") continue;
    const block = entry as Record<string, unknown>;
    if (typeof block.mediaId === "string" && block.mediaId.trim()) {
      ids.add(block.mediaId.trim());
    }
    if (Array.isArray(block.items)) {
      for (const item of block.items) {
        if (item && typeof item === "object") {
          const mediaId = (item as Record<string, unknown>).mediaId;
          if (typeof mediaId === "string" && mediaId.trim()) ids.add(mediaId.trim());
        }
      }
    }
  }
  return [...ids];
}

export function extractMediaIdsFromDescriptionBlocks(blocks: unknown): string[] {
  try {
    const parsed = Array.isArray(blocks) ? parseProductDescriptionBlocks(blocks) : null;
    if (!parsed?.length) return collectMediaIdsLoose(blocks);
    const ids = new Set<string>();
    for (const block of parsed) {
      if (block.type === "image") ids.add(block.mediaId);
      if (block.type === "imageGrid") {
        for (const item of block.items) ids.add(item.mediaId);
      }
    }
    return [...ids];
  } catch {
    return collectMediaIdsLoose(blocks);
  }
}

export function extractImageUrlsFromDescriptionBlocks(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  const urls = new Set<string>();
  for (const entry of blocks) {
    if (!entry || typeof entry !== "object") continue;
    const block = entry as Record<string, unknown>;
    if (typeof block.imageUrl === "string" && block.imageUrl.trim()) {
      urls.add(block.imageUrl.trim());
    }
    if (Array.isArray(block.items)) {
      for (const item of block.items) {
        if (item && typeof item === "object") {
          const imageUrl = (item as Record<string, unknown>).imageUrl;
          if (typeof imageUrl === "string" && imageUrl.trim()) urls.add(imageUrl.trim());
        }
      }
    }
  }
  return [...urls];
}

/** True when description blocks reference this asset via mediaId (canonical) or matching URL snapshot. */
export function descriptionBlocksReferenceMediaAsset(
  blocks: unknown,
  assetId: string,
  assetUrls: readonly string[] = [],
): boolean {
  const ids = extractMediaIdsFromDescriptionBlocks(blocks);
  if (ids.includes(assetId)) return true;
  if (!assetUrls.length) return false;
  const urls = new Set(extractImageUrlsFromDescriptionBlocks(blocks));
  return assetUrls.some((url) => url && urls.has(url));
}

/**
 * Prefer current Media Library URL; never let a stale client snapshot override a valid library URL.
 * Snapshot is used only when the library asset is missing (public safe fallback).
 */
export function resolveDescriptionImageUrl(
  libraryUrl: string | null | undefined,
  snapshotUrl: string | null | undefined,
): string | null {
  const library = libraryUrl?.trim() ?? "";
  if (library && isSafeHttpUrl(library)) return library;
  const snapshot = snapshotUrl?.trim() ?? "";
  if (snapshot && isSafeHttpUrl(snapshot)) return snapshot;
  return null;
}

/**
 * Overwrite imageUrl from Media Library for every mediaId (one batch lookup provided by caller).
 * Rejects missing media IDs — admin save must not persist arbitrary client URLs.
 */
export function applyMediaLibraryUrlsToDescriptionBlocks(
  blocks: ProductDescriptionBlock[],
  mediaById: Map<string, MediaLibraryUrlRecord>,
): ProductDescriptionBlock[] {
  return blocks.map((block, index) => {
    if (block.type === "image") {
      const asset = mediaById.get(block.mediaId);
      if (!asset?.url || !isSafeHttpUrl(asset.url)) {
        throw new ProductDescriptionBlocksValidationError(
          "Một hoặc nhiều ảnh trong mô tả nâng cao không tồn tại trong thư viện media.",
          { [`descriptionBlocks.${index}.mediaId`]: "Ảnh media không hợp lệ hoặc đã bị xóa." },
        );
      }
      return { ...block, imageUrl: asset.url };
    }
    if (block.type === "imageGrid") {
      return {
        ...block,
        items: block.items.map((item, itemIndex) => {
          const asset = mediaById.get(item.mediaId);
          if (!asset?.url || !isSafeHttpUrl(asset.url)) {
            throw new ProductDescriptionBlocksValidationError(
              "Một hoặc nhiều ảnh trong mô tả nâng cao không tồn tại trong thư viện media.",
              {
                [`descriptionBlocks.${index}.items.${itemIndex}.mediaId`]:
                  "Ảnh media không hợp lệ hoặc đã bị xóa.",
              },
            );
          }
          return { ...item, imageUrl: asset.url };
        }),
      };
    }
    return block;
  });
}

/**
 * Public hydrate: prefer live Media Library URLs; fall back to safe snapshots; drop broken images.
 */
export function hydratePublicDescriptionBlocks(
  blocks: ProductDescriptionBlock[] | null | undefined,
  mediaById: Map<string, MediaLibraryUrlRecord>,
): PublicProductDescriptionBlock[] | null {
  if (!blocks?.length) return null;
  const hydrated: ProductDescriptionBlock[] = [];

  for (const block of blocks) {
    if (block.type === "heading" || block.type === "paragraph" || block.type === "bulletList") {
      hydrated.push(block);
      continue;
    }
    if (block.type === "image") {
      const resolved = resolveDescriptionImageUrl(mediaById.get(block.mediaId)?.url, block.imageUrl);
      if (!resolved || !block.alt.trim()) continue;
      hydrated.push({ ...block, imageUrl: resolved });
      continue;
    }
    if (block.type === "imageGrid") {
      const items = block.items
        .map((item) => {
          const resolved = resolveDescriptionImageUrl(mediaById.get(item.mediaId)?.url, item.imageUrl);
          if (!resolved || !item.alt.trim()) return null;
          return { ...item, imageUrl: resolved };
        })
        .filter((item): item is ProductDescriptionImageGridItem => Boolean(item));
      if (!items.length) continue;
      hydrated.push({ ...block, items });
    }
  }

  return toPublicDescriptionBlocks(hydrated);
}

export function toPublicDescriptionBlocks(
  blocks: ProductDescriptionBlock[] | null | undefined,
): PublicProductDescriptionBlock[] | null {
  if (!hasVisibleDescriptionBlocks(blocks)) return null;
  return blocks!.map((block) => {
    if (block.type === "heading") {
      return { id: block.id, type: "heading", level: block.level, text: block.text };
    }
    if (block.type === "paragraph") {
      return { id: block.id, type: "paragraph", text: block.text };
    }
    if (block.type === "bulletList") {
      return { id: block.id, type: "bulletList", items: [...block.items] };
    }
    if (block.type === "image") {
      return {
        id: block.id,
        type: "image",
        mediaId: block.mediaId,
        imageUrl: block.imageUrl,
        alt: block.alt,
        caption: block.caption,
        layout: block.layout,
      };
    }
    return {
      id: block.id,
      type: "imageGrid",
      items: block.items.map((item) => ({
        mediaId: item.mediaId,
        imageUrl: item.imageUrl,
        alt: item.alt,
        caption: item.caption,
      })),
    };
  });
}

export function createEmptyHeadingBlock(level: 2 | 3 = 2): ProductDescriptionHeadingBlock {
  return { id: createProductDescriptionBlockId(), type: "heading", level, text: "" };
}

export function createEmptyParagraphBlock(): ProductDescriptionParagraphBlock {
  return { id: createProductDescriptionBlockId(), type: "paragraph", text: "" };
}

export function createEmptyBulletListBlock(): ProductDescriptionBulletListBlock {
  return { id: createProductDescriptionBlockId(), type: "bulletList", items: [""] };
}

export function createEmptyImageBlock(): ProductDescriptionImageBlock {
  return {
    id: createProductDescriptionBlockId(),
    type: "image",
    mediaId: "",
    imageUrl: "",
    alt: "",
    caption: "",
    layout: "content",
  };
}

export function createEmptyImageGridBlock(): ProductDescriptionImageGridBlock {
  return {
    id: createProductDescriptionBlockId(),
    type: "imageGrid",
    items: [
      { mediaId: "", imageUrl: "", alt: "", caption: "" },
      { mediaId: "", imageUrl: "", alt: "", caption: "" },
    ],
  };
}
