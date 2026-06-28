import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { ProductAttributeAssignmentFormRow } from "@/features/products/product-catalog-form-mappers";
import {
  findVariantForFieldKey,
  focusVariantField,
  parseVariantFieldKey,
  variantFieldLabel,
} from "@/features/products/variant-field-errors";
import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";
import {
  keysToClearForField,
  normalizeProductFormFieldErrors,
  type ProductFormErrorContext,
} from "@/features/products/product-form-row-error-keys";
import { resolveTabForField } from "@/features/products/product-catalog-form-validation";

export type ProductFormTabId = "basic" | "media" | "variants" | "content" | "seo";

export type ProductFormErrorDescriptor = {
  key: string;
  message: string;
  tab: ProductFormTabId;
  section?: string;
  rowId?: string;
  clientKey?: string;
  field?: string;
  focusTarget: string;
  severity: "field" | "row" | "section" | "form";
};

export type ProductFormDescriptorContext = ProductFormErrorContext & {
  sharedAttributes?: Array<{ id: string; code: string; name?: string }>;
  variants?: MatrixVariantFormRow[];
  form?: {
    name: string;
    categoryId: string;
    featuredImage: string;
    gallery: string[];
    defaultMoq: string;
    leadTime?: string;
    slug?: string;
    options: OptionGroupFormRow[];
    variants: MatrixVariantFormRow[];
    attributeAssignments?: ProductAttributeAssignmentFormRow[];
  };
};

const TAB_LABELS: Record<ProductFormTabId, string> = {
  basic: "Thông tin cơ bản",
  media: "Hình ảnh & media",
  variants: "Thuộc tính & biến thể",
  content: "Mô tả & thông số",
  seo: "SEO & hiển thị",
};

const BASIC_TAB_ASSIGNMENT_CODES = new Set(["MATERIAL", "FIT"]);

const FIELD_LABELS: Record<string, string> = {
  name: "Tên sản phẩm",
  categoryId: "Danh mục",
  slug: "Slug",
  productCode: "ID sản phẩm",
  defaultMoq: "MOQ",
  leadTime: "Lead time",
  featuredImage: "Ảnh đại diện",
  curatedSalesBadges: "Nhãn bán hàng",
  shortDescription: "Mô tả ngắn",
  description: "Mô tả",
  tags: "Tags",
  useCases: "Use cases",
  targetCustomers: "Khách hàng mục tiêu",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  options: "Nhóm biến thể",
  variants: "Biến thể",
  attributeId: "Thuộc tính",
  attributeValueId: "Giá trị",
  customValue: "Giá trị riêng",
  label: "Nhãn",
  value: "Giá trị",
  valueCode: "Mã giá trị",
  imageUrl: "Ảnh",
  sku: "SKU",
  stockQty: "Tồn kho",
  wholesalePrice: "Giá sỉ",
  dealerPrice: "Giá đại lý",
  moqOverride: "MOQ ghi đè",
  leadTimeOverride: "Lead time ghi đè",
  optionValueIds: "Tổ hợp thuộc tính",
};

const STICKY_HEADER_OFFSET = 88;

function humanFieldLabel(field: string | undefined): string {
  if (!field) return "Trường";
  return FIELD_LABELS[field] ?? variantFieldLabel(field) ?? field;
}

function resolveAssignmentSection(
  fieldKey: string,
  context: ProductFormDescriptorContext,
): { section: string; focusTarget: string; rowId?: string; clientKey?: string; field?: string } {
  const byId = /^attributeAssignments\.byId\.([^.]+)\.(.+)$/.exec(fieldKey);
  if (byId) {
    const row = context.attributeAssignments?.find((item) => item.id === byId[1]);
    const attr = row
      ? context.sharedAttributes?.find((item) => item.id === row.attributeId)
      : undefined;
    const isB2B = attr && BASIC_TAB_ASSIGNMENT_CODES.has(attr.code);
    return {
      section: isB2B ? "B2B" : "Thông tin thuộc tính",
      focusTarget: isB2B
        ? attr!.code === "MATERIAL"
          ? "b2b-material"
          : "b2b-fit"
        : fieldKey,
      rowId: byId[1],
      field: byId[2],
      clientKey: row?.clientKey,
    };
  }

  const byClientKey = /^attributeAssignments\.byClientKey\.([^.]+)\.(.+)$/.exec(fieldKey);
  if (byClientKey) {
    const row = context.attributeAssignments?.find((item) => item.clientKey === byClientKey[1]);
    const attr = row
      ? context.sharedAttributes?.find((item) => item.id === row.attributeId)
      : undefined;
    const isB2B = attr && BASIC_TAB_ASSIGNMENT_CODES.has(attr.code);
    return {
      section: isB2B ? "B2B" : "Thông tin thuộc tính",
      focusTarget: isB2B
        ? attr!.code === "MATERIAL"
          ? "b2b-material"
          : "b2b-fit"
        : fieldKey,
      clientKey: byClientKey[1],
      field: byClientKey[2],
    };
  }

  const byIndex = /^attributeAssignments\.(\d+)\.(.+)$/.exec(fieldKey);
  if (byIndex) {
    const row = context.attributeAssignments?.[Number(byIndex[1])];
    const attr = row
      ? context.sharedAttributes?.find((item) => item.id === row.attributeId)
      : undefined;
    const isB2B = attr && BASIC_TAB_ASSIGNMENT_CODES.has(attr.code);
    return {
      section: isB2B ? "B2B" : "Thông tin thuộc tính",
      focusTarget: isB2B
        ? attr!.code === "MATERIAL"
          ? "b2b-material"
          : "b2b-fit"
        : fieldKey,
      clientKey: row?.clientKey,
      rowId: row?.id,
      field: byIndex[2],
    };
  }

  return { section: "Thông tin thuộc tính", focusTarget: fieldKey };
}

function resolveOptionSection(fieldKey: string): { section: string; focusTarget: string; field?: string } {
  if (fieldKey === "options") {
    return { section: "Nhóm biến thể", focusTarget: "options", field: "options" };
  }
  return { section: "Nhóm biến thể", focusTarget: fieldKey, field: fieldKey.split(".").pop() };
}

function resolveVariantSection(
  fieldKey: string,
  context: ProductFormDescriptorContext,
): { section: string; focusTarget: string; field?: string; clientKey?: string; rowId?: string } {
  if (fieldKey === "variants") {
    return { section: "Biến thể", focusTarget: "variants", field: "variants" };
  }
  const parsed = parseVariantFieldKey(fieldKey);
  const located = context.variants ? findVariantForFieldKey(fieldKey, context.variants) : null;
  return {
    section: "Biến thể",
    focusTarget: fieldKey,
    field: parsed?.field,
    clientKey: located?.variant.clientKey,
    rowId: located?.variant.id,
  };
}

function resolveDescriptorMeta(
  fieldKey: string,
  context: ProductFormDescriptorContext,
): Pick<ProductFormErrorDescriptor, "tab" | "section" | "focusTarget" | "rowId" | "clientKey" | "field" | "severity"> {
  if (fieldKey.startsWith("attributeAssignments")) {
    const meta = resolveAssignmentSection(fieldKey, context);
    const tabContext = context.form
      ? { form: context.form, sharedAttributes: context.sharedAttributes }
      : undefined;
    return {
      tab: resolveTabForField(fieldKey, tabContext) as ProductFormTabId,
      section: meta.section,
      focusTarget: meta.focusTarget,
      rowId: meta.rowId,
      clientKey: meta.clientKey,
      field: meta.field,
      severity: meta.field ? "field" : "row",
    };
  }

  if (fieldKey.startsWith("options")) {
    const meta = resolveOptionSection(fieldKey);
    return {
      tab: "variants",
      section: meta.section,
      focusTarget: meta.focusTarget,
      field: meta.field,
      severity: fieldKey === "options" ? "section" : "field",
    };
  }

  if (fieldKey.startsWith("variants")) {
    const meta = resolveVariantSection(fieldKey, context);
    return {
      tab: "variants",
      section: meta.section,
      focusTarget: meta.focusTarget,
      rowId: meta.rowId,
      clientKey: meta.clientKey,
      field: meta.field,
      severity: fieldKey === "variants" ? "section" : "field",
    };
  }

  if (fieldKey.startsWith("specifications")) {
    return {
      tab: "content",
      section: "Thông số nổi bật",
      focusTarget: fieldKey,
      field: fieldKey.split(".").pop(),
      severity: "field",
    };
  }

  if (fieldKey.startsWith("customizations")) {
    return {
      tab: "content",
      section: "Khả năng tùy chỉnh",
      focusTarget: fieldKey,
      field: fieldKey.split(".").pop(),
      severity: "field",
    };
  }

  if (fieldKey.startsWith("gallery") || fieldKey === "featuredImage" || fieldKey === "curatedSalesBadges") {
    return {
      tab: "media",
      section: fieldKey === "curatedSalesBadges" ? "Nhãn bán hàng trên ảnh đại diện" : fieldKey.startsWith("gallery") ? "Thư viện ảnh" : "Ảnh đại diện",
      focusTarget: fieldKey,
      field: fieldKey.split(".").pop() ?? fieldKey,
      severity: "field",
    };
  }

  const tab = resolveTabForField(fieldKey, context.form ? { form: context.form, sharedAttributes: context.sharedAttributes } : undefined) as ProductFormTabId;
  let section = "Thông tin cơ bản";
  if (fieldKey === "defaultMoq" || fieldKey === "leadTime") section = "B2B";
  if (fieldKey === "shortDescription" || fieldKey === "description") section = "Nội dung";
  if (fieldKey.startsWith("seo")) section = "SEO";

  return {
    tab,
    section,
    focusTarget: fieldKey,
    field: fieldKey,
    severity: "field",
  };
}

export function buildProductFormErrorDescriptors(
  fieldErrors: Record<string, string>,
  context: ProductFormDescriptorContext,
): ProductFormErrorDescriptor[] {
  const normalized = normalizeProductFormFieldErrors(fieldErrors, context);
  return Object.entries(normalized).map(([key, message]) => {
    const meta = resolveDescriptorMeta(key, context);
    return {
      key,
      message,
      ...meta,
    };
  });
}

export function countErrorsByTab(descriptors: ProductFormErrorDescriptor[]): Record<ProductFormTabId, number> {
  const counts: Record<ProductFormTabId, number> = {
    basic: 0,
    media: 0,
    variants: 0,
    content: 0,
    seo: 0,
  };
  for (const descriptor of descriptors) {
    counts[descriptor.tab] += 1;
  }
  return counts;
}

export function formatErrorSummaryLine(descriptor: ProductFormErrorDescriptor): string {
  const tab = TAB_LABELS[descriptor.tab];
  const section = descriptor.section ?? tab;
  const field = humanFieldLabel(descriptor.field);
  return `${tab} · ${section} — ${field}: ${descriptor.message}`;
}

export function clearFieldErrorsForEdit(
  fieldErrors: Record<string, string>,
  editedKey: string,
): Record<string, string> {
  const keysToRemove = new Set(keysToClearForField(editedKey));
  const next: Record<string, string> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    if (keysToRemove.has(key)) continue;
    if (key.startsWith(`${editedKey}.`)) continue;
    const editedPrefix = editedKey.split(".").slice(0, -1).join(".");
    if (editedPrefix && key.startsWith(`${editedPrefix}.`) && key.endsWith(`.${editedKey.split(".").pop()}`)) {
      continue;
    }
    next[key] = message;
  }
  return next;
}

function waitForElement(selector: string, timeoutMs = 2000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLElement>(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        window.clearInterval(timer);
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 50);
  });
}

function scrollWithOffset(el: HTMLElement): void {
  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export async function focusProductFormError(
  descriptor: ProductFormErrorDescriptor,
  handlers?: {
    setActiveTab?: (tab: ProductFormTabId) => void;
    expandVariantRow?: (clientKey: string) => void;
    expandOptionGroup?: (clientKey: string) => void;
  },
): Promise<void> {
  handlers?.setActiveTab?.(descriptor.tab);

  if (descriptor.clientKey && descriptor.tab === "variants") {
    if (descriptor.key.startsWith("variants")) {
      handlers?.expandVariantRow?.(descriptor.clientKey);
    }
    if (descriptor.key.startsWith("options")) {
      handlers?.expandOptionGroup?.(descriptor.clientKey);
    }
  }

  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (descriptor.key.startsWith("variants.")) {
    focusVariantField(descriptor.focusTarget);
    return;
  }

  const b2bTarget = descriptor.focusTarget;
  if (b2bTarget === "b2b-material" || b2bTarget === "b2b-fit") {
    const el = await waitForElement(`[data-field="${b2bTarget}"]`);
    if (el) {
      scrollWithOffset(el);
      const focusable = el.matches("input,select,textarea,button")
        ? el
        : el.querySelector<HTMLElement>("input,select,textarea,button");
      focusable?.focus({ preventScroll: true });
    }
    return;
  }

  const el = await waitForElement(`[data-field="${descriptor.focusTarget}"]`);
  if (!el) {
    const prefix = await waitForElement(`[data-field-prefix="${descriptor.focusTarget.split(".")[0]}"]`);
    if (prefix) scrollWithOffset(prefix);
    return;
  }

  scrollWithOffset(el);
  const focusable = el.matches("input,select,textarea,button")
    ? el
    : el.querySelector<HTMLElement>("input,select,textarea,button");
  focusable?.focus({ preventScroll: true });
}

export function sectionHasError(
  descriptors: ProductFormErrorDescriptor[],
  matcher: (descriptor: ProductFormErrorDescriptor) => boolean,
): boolean {
  return descriptors.some(matcher);
}

export function countSectionErrors(
  descriptors: ProductFormErrorDescriptor[],
  matcher: (descriptor: ProductFormErrorDescriptor) => boolean,
): number {
  return descriptors.filter(matcher).length;
}

export { TAB_LABELS, humanFieldLabel };
