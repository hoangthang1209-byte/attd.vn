/**
 * Deterministic Vietnamese B2B content suggestions for admin product editor.
 * No external AI — safe in production without API keys.
 */

import { isSizeOptionGroup, type ProductSizeChart } from "@/features/products/product-size-chart";

export type ProductContentSuggestionInput = {
  name?: string | null;
  categoryName?: string | null;
  productMode?: string | null;
  productTemplateKey?: string | null;
  defaultMoq?: string | number | null;
  leadTime?: string | null;
  material?: string | null;
  useCases?: string | string[] | null;
  targetCustomers?: string | string[] | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  options?: Array<{
    name?: string | null;
    slug?: string | null;
    values?: Array<{ label?: string | null }>;
  }>;
  variants?: Array<{
    colorName?: string | null;
    sizeName?: string | null;
  }>;
  specifications?: Array<{ label?: string | null; value?: string | null }>;
  customizations?: Array<{ label?: string | null; description?: string | null; enabled?: boolean }>;
  sizeChart?: ProductSizeChart | null;
  shortDescription?: string | null;
  description?: string | null;
  colors?: string[] | null;
  sizes?: string[] | null;
};

const BRAND = "ATTD";
const OVERWRITE_CONFIRM_MESSAGE =
  "Trường này đã có nội dung. Bạn muốn thay bằng nội dung gợi ý mới không?";

export function confirmOverwriteExistingContent(existing: string | null | undefined): boolean {
  const trimmed = (existing ?? "").trim();
  if (!trimmed) return true;
  if (typeof window === "undefined") return false;
  return window.confirm(OVERWRITE_CONFIRM_MESSAGE);
}

function trimText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function splitCsv(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => trimText(item)).filter(Boolean);
  }
  const raw = trimText(value);
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeTagKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeTagKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function isColorOptionGroup(option: {
  name?: string | null;
  slug?: string | null;
}): boolean {
  const slug = trimText(option.slug).toLowerCase();
  const name = trimText(option.name).toLowerCase();
  return slug.includes("color") || slug.includes("mau") || name.includes("màu");
}

export function extractSuggestionColors(input: ProductContentSuggestionInput): string[] {
  if (input.colors?.length) return dedupePreserveOrder(input.colors.map(trimText));
  const fromOptions: string[] = [];
  for (const group of input.options ?? []) {
    if (!isColorOptionGroup(group)) continue;
    for (const value of group.values ?? []) {
      const label = trimText(value.label);
      if (label) fromOptions.push(label);
    }
  }
  if (fromOptions.length) return dedupePreserveOrder(fromOptions);
  return dedupePreserveOrder((input.variants ?? []).map((v) => trimText(v.colorName)));
}

export function extractSuggestionSizes(input: ProductContentSuggestionInput): string[] {
  if (input.sizes?.length) return dedupePreserveOrder(input.sizes.map(trimText));
  const fromOptions: string[] = [];
  for (const group of input.options ?? []) {
    if (!isSizeOptionGroup(group)) continue;
    for (const value of group.values ?? []) {
      const label = trimText(value.label);
      if (label) fromOptions.push(label);
    }
  }
  if (fromOptions.length) return dedupePreserveOrder(fromOptions);
  if (input.sizeChart?.rows?.length) {
    return dedupePreserveOrder(input.sizeChart.rows.map((row) => trimText(row.size)));
  }
  return dedupePreserveOrder((input.variants ?? []).map((v) => trimText(v.sizeName)));
}

function formatList(values: string[], max = 6): string {
  const list = values.slice(0, max);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0]!;
  if (list.length === 2) return `${list[0]} và ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} và ${list[list.length - 1]}`;
}

function productLabel(input: ProductContentSuggestionInput): string {
  return trimText(input.name) || trimText(input.categoryName) || "sản phẩm";
}

function categoryLabel(input: ProductContentSuggestionInput): string {
  return trimText(input.categoryName);
}

function moqText(input: ProductContentSuggestionInput): string {
  if (input.defaultMoq == null || input.defaultMoq === "") return "";
  const n = typeof input.defaultMoq === "number" ? input.defaultMoq : Number(String(input.defaultMoq).replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return `MOQ từ ${Math.round(n)} cái`;
}

function customizationPhrases(input: ProductContentSuggestionInput): string[] {
  const phrases: string[] = [];
  if (input.supportsPrinting) phrases.push("in logo / in hình");
  if (input.supportsEmbroidery) phrases.push("thêu");
  if (input.supportsOem) phrases.push("OEM / private label");
  for (const row of input.customizations ?? []) {
    if (row.enabled === false) continue;
    const label = trimText(row.label);
    if (label) phrases.push(label);
  }
  return dedupePreserveOrder(phrases);
}

function useCasePhrases(input: ProductContentSuggestionInput): string[] {
  const fromField = splitCsv(input.useCases);
  if (fromField.length) return fromField;
  return ["đồng phục", "sự kiện", "bán sỉ", "merchandise"];
}

/** 1–2 concise Vietnamese sentences. */
export function suggestProductShortDescription(input: ProductContentSuggestionInput): string {
  const name = productLabel(input);
  const category = categoryLabel(input);
  const colors = extractSuggestionColors(input);
  const sizes = extractSuggestionSizes(input);
  const customs = customizationPhrases(input);
  const subject = category ? `${name}` : name;

  const suitBits = useCasePhrases(input).slice(0, 3);
  let sentence1 = `${subject} phù hợp cho đơn hàng ${formatList(suitBits, 3)}`;
  if (category && normalizeTagKey(category) !== normalizeTagKey(name)) {
    sentence1 = `${name} (${category}) phù hợp cho đơn hàng ${formatList(suitBits, 3)}`;
  }
  sentence1 += ".";

  const extras: string[] = [];
  if (colors.length) extras.push(`nhiều màu sắc (${formatList(colors, 4)})`);
  if (sizes.length) extras.push(`đầy đủ size ${formatList(sizes, 5)}`);
  if (customs.length) extras.push(`hỗ trợ ${formatList(customs, 3)}`);
  const moq = moqText(input);
  if (moq) extras.push(moq);

  if (extras.length === 0) {
    return `${sentence1} Hỗ trợ tư vấn theo nhu cầu đặt hàng B2B.`;
  }
  return `${sentence1} Sản phẩm hỗ trợ ${formatList(extras, 4)}.`;
}

/** Clean paragraphs/bullets; never invent missing technical specs. */
export function suggestProductLongDescription(input: ProductContentSuggestionInput): string {
  const name = productLabel(input);
  const category = categoryLabel(input);
  const colors = extractSuggestionColors(input);
  const sizes = extractSuggestionSizes(input);
  const customs = customizationPhrases(input);
  const moq = moqText(input);
  const lead = trimText(input.leadTime);
  const material = trimText(input.material);
  const uses = useCasePhrases(input);
  const customers = splitCsv(input.targetCustomers);
  const specs = (input.specifications ?? [])
    .map((row) => ({ label: trimText(row.label), value: trimText(row.value) }))
    .filter((row) => row.label && row.value);

  const paragraphs: string[] = [];

  paragraphs.push(
    [
      `${name}${category ? ` thuộc nhóm ${category}` : ""} phù hợp cho khách hàng B2B cần đặt số lượng lớn`,
      uses.length ? ` như ${formatList(uses, 4)}` : "",
      ".",
    ].join(""),
  );

  const factLines: string[] = [];
  if (material) factLines.push(`Chất liệu: ${material}`);
  if (moq) factLines.push(moq);
  if (lead) factLines.push(`Thời gian sản xuất / giao hàng: ${lead}`);
  if (colors.length) factLines.push(`Màu sắc có sẵn: ${formatList(colors, 8)}`);
  if (sizes.length) factLines.push(`Size có sẵn: ${formatList(sizes, 8)}`);
  if (customs.length) factLines.push(`Phương án tùy chỉnh: ${formatList(customs, 5)}`);
  if (customers.length) factLines.push(`Đối tượng phù hợp: ${formatList(customers, 4)}`);
  for (const spec of specs.slice(0, 6)) {
    factLines.push(`${spec.label}: ${spec.value}`);
  }

  if (factLines.length) {
    paragraphs.push(["Thông tin hiện có trên sản phẩm:", ...factLines.map((line) => `- ${line}`)].join("\n"));
  }

  paragraphs.push(
    `${BRAND} hỗ trợ tư vấn màu sắc, size${customs.length ? ", phương án in/thêu" : ""} và thời gian sản xuất theo số lượng thực tế. Vui lòng liên hệ để nhận báo giá phù hợp đơn hàng của bạn.`,
  );

  return paragraphs.join("\n\n");
}

/** 5–10 concise tags, deduped and normalized. */
export function suggestProductTags(input: ProductContentSuggestionInput): string[] {
  const tags: string[] = [];
  const name = trimText(input.name);
  const category = trimText(input.categoryName);
  if (category) tags.push(category.toLowerCase());
  if (name) {
    const shortName = name
      .replace(/\b(test|demo|sample)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (shortName) tags.push(shortName.toLowerCase());
  }

  tags.push(...useCasePhrases(input).map((t) => t.toLowerCase()));
  tags.push("bán sỉ");

  if (input.supportsPrinting) tags.push("in logo");
  if (input.supportsEmbroidery) tags.push("thêu");
  if (input.supportsOem) tags.push("oem");

  const material = trimText(input.material);
  if (material) tags.push(material.toLowerCase());

  for (const color of extractSuggestionColors(input).slice(0, 3)) {
    tags.push(color.toLowerCase());
  }
  for (const size of extractSuggestionSizes(input).slice(0, 2)) {
    tags.push(`size ${size}`.toLowerCase());
  }

  const normalized = dedupePreserveOrder(tags)
    .map((tag) => tag.replace(/\s+/g, " ").trim())
    .filter((tag) => tag.length >= 2 && tag.length <= 40);

  if (normalized.length < 5) {
    for (const fallback of ["đồng phục", "sự kiện", "merchandise", "doanh nghiệp", "đặt theo yêu cầu"]) {
      if (normalized.length >= 5) break;
      if (!normalized.some((t) => normalizeTagKey(t) === normalizeTagKey(fallback))) {
        normalized.push(fallback);
      }
    }
  }

  return normalized.slice(0, 10);
}

export function suggestProductSeoTitle(input: ProductContentSuggestionInput): string {
  const name = trimText(input.name) || trimText(input.categoryName) || "Sản phẩm";
  const bits = [name, "bán sỉ"];
  if (input.supportsOem || input.supportsPrinting || input.supportsEmbroidery) {
    bits.push("đặt sản xuất theo yêu cầu");
  } else {
    bits.push("đặt hàng doanh nghiệp");
  }
  let title = `${bits.join(", ")} | ${BRAND}`;
  if (title.length > 65) {
    title = `${name} bán sỉ | ${BRAND}`;
  }
  if (title.length > 70) {
    title = `${name.slice(0, 50).trim()} | ${BRAND}`;
  }
  return title;
}

export function suggestProductSeoDescription(input: ProductContentSuggestionInput): string {
  const name = productLabel(input);
  const colors = extractSuggestionColors(input);
  const sizes = extractSuggestionSizes(input);
  const customs = customizationPhrases(input);
  const moq = moqText(input);

  const parts: string[] = [
    `Đặt ${name} số lượng lớn tại ${BRAND}`,
  ];
  if (colors.length || sizes.length) {
    parts.push(
      `hỗ trợ ${[
        colors.length ? "nhiều màu sắc" : "",
        sizes.length ? "size" : "",
      ]
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (customs.length) {
    parts.push(`và ${formatList(customs, 2)} theo nhu cầu doanh nghiệp`);
  } else {
    parts.push("theo nhu cầu doanh nghiệp");
  }
  if (moq) parts.push(`(${moq})`);

  let text = `${parts.join(", ")}.`;
  text = text.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
  if (text.length > 160) {
    text = `Đặt ${name} số lượng lớn tại ${BRAND}, hỗ trợ tư vấn màu sắc, size và báo giá B2B.`;
  }
  return text;
}

export function suggestProductImageAlt(input: ProductContentSuggestionInput): string {
  const name = trimText(input.name) || "Sản phẩm";
  const category = trimText(input.categoryName);
  const colors = extractSuggestionColors(input);
  const parts = [name];
  if (category && normalizeTagKey(category) !== normalizeTagKey(name)) {
    parts.push(category);
  }
  if (colors[0]) parts.push(`màu ${colors[0]}`);
  return parts.join(" — ");
}

export function suggestProductSizeChartNote(input: ProductContentSuggestionInput): string {
  const unit = input.sizeChart?.unit === "inch" ? "inch" : "cm";
  const columns = (input.sizeChart?.columns ?? [])
    .map((column) => trimText(column.label))
    .filter(Boolean);
  const columnHint = columns.length
    ? ` theo các thông số ${formatList(columns, 4)}`
    : "";
  return `Thông số size mang tính tham khảo${columnHint}. Có thể chênh lệch ±1–2${unit} tùy chất liệu và phương pháp đo. Vui lòng liên hệ ${BRAND} nếu cần hỗ trợ chọn size theo mẫu thực tế.`;
}

/** Suggest specification rows only from known product facts — never invent. */
export function suggestProductSpecificationSummary(
  input: ProductContentSuggestionInput,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const material = trimText(input.material);
  if (material) rows.push({ label: "Chất liệu", value: material });
  const moq = moqText(input);
  if (moq) rows.push({ label: "MOQ", value: moq.replace(/^MOQ từ\s*/i, "") });
  const lead = trimText(input.leadTime);
  if (lead) rows.push({ label: "Thời gian sản xuất", value: lead });
  const colors = extractSuggestionColors(input);
  if (colors.length) rows.push({ label: "Màu sắc", value: formatList(colors, 10) });
  const sizes = extractSuggestionSizes(input);
  if (sizes.length) rows.push({ label: "Size", value: formatList(sizes, 12) });
  const customs = customizationPhrases(input);
  if (customs.length) rows.push({ label: "Tùy chỉnh", value: formatList(customs, 6) });
  return rows;
}

/** Suggest a customization capability note from print/OEM flags. */
export function suggestProductCustomizationNote(input: ProductContentSuggestionInput): {
  label: string;
  description: string;
} | null {
  const customs = customizationPhrases(input);
  if (!customs.length && !input.supportsPrinting && !input.supportsEmbroidery && !input.supportsOem) {
    return null;
  }
  const methods = customs.length ? formatList(customs, 4) : "in / thêu / OEM";
  return {
    label: "Tùy chỉnh theo yêu cầu",
    description: `Hỗ trợ ${methods} theo nhu cầu doanh nghiệp. ATTD tư vấn vị trí in/thêu, số lượng và thời gian sản xuất theo đơn hàng thực tế.`,
  };
}

export function joinSuggestedTags(tags: string[]): string {
  return dedupePreserveOrder(tags).join(", ");
}

export function parseTagsInput(value: string): string[] {
  return dedupePreserveOrder(splitCsv(value));
}

export const PRODUCT_CONTENT_SUGGESTION_OVERWRITE_MESSAGE = OVERWRITE_CONFIRM_MESSAGE;
